import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getRecommendedProducts from '@salesforce/apex/UKGProductService.getRecommendedProducts';
import getAllProducts from '@salesforce/apex/UKGProductService.getAllProducts';
import getLeadById from '@salesforce/apex/UKGProductService.getLeadById';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

// Opportunity fields to detect context
const OPP_FIELDS = [
    'Opportunity.Name',
    'Opportunity.AccountId'
];

export default class ProductRecommendations extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;
    @api leadId;

    @track recommendations = [];
    @track selectedProductIds = [];
    @track selectedCategory = '';
    @track selectedTier = '';
    @track isLoading = true;
    @track leadRecord = null;

    connectedCallback() {
        this.loadData();
    }

    async loadData() {
        this.isLoading = true;
        try {
            // If on a Lead record page, use recordId as leadId
            const effectiveLeadId = this.objectApiName === 'Lead' ? this.recordId : this.leadId;

            if (effectiveLeadId) {
                this.leadRecord = await getLeadById({ leadId: effectiveLeadId });
                const requirements = this.leadRecord.Requirements__c
                    ? this.leadRecord.Requirements__c.split(',').map(r => r.trim())
                    : [];

                if (requirements.length > 0) {
                    this.recommendations = await getRecommendedProducts({
                        industry: this.leadRecord.Industry || '',
                        employeeCount: this.leadRecord.Employee_Count__c || 0,
                        requirements: requirements
                    });
                } else {
                    this.recommendations = await getAllProducts();
                }
            } else {
                this.recommendations = await getAllProducts();
            }
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            this.isLoading = false;
        }
    }

    get hasLeadData() {
        return this.leadRecord && this.leadRecord.Company;
    }

    get leadCompanyName() {
        return this.leadRecord ? this.leadRecord.Company : '';
    }

    get leadEmployeeCount() {
        return this.leadRecord ? this.leadRecord.Employee_Count__c : '';
    }

    get leadIndustry() {
        return this.leadRecord ? this.leadRecord.Industry : '';
    }

    get categoryOptions() {
        const cats = new Set();
        this.recommendations.forEach(r => cats.add(r.product.Category__c));
        const options = [{ label: 'All Categories', value: '' }];
        cats.forEach(c => {
            if (c) options.push({ label: c, value: c });
        });
        return options;
    }

    get tierOptions() {
        return [
            { label: 'All Tiers', value: '' },
            { label: 'Enterprise', value: 'Enterprise' },
            { label: 'Mid-Market', value: 'Mid-Market' },
            { label: 'Add-On', value: 'Add-On' }
        ];
    }

    get filteredProducts() {
        return this.recommendations
            .filter(r => {
                if (this.selectedCategory && r.product.Category__c !== this.selectedCategory) return false;
                if (this.selectedTier && r.product.Tier__c !== this.selectedTier) return false;
                return true;
            })
            .map(r => ({
                ...r,
                isSelected: this.selectedProductIds.includes(r.product.Id),
                reasons: r.reasons || [],
                affinityProducts: r.affinityProducts || []
            }));
    }

    get hasProducts() {
        return !this.isLoading && this.filteredProducts.length > 0;
    }

    get noProducts() {
        return !this.isLoading && this.filteredProducts.length === 0;
    }

    get selectedProductsList() {
        return this.recommendations.filter(r =>
            this.selectedProductIds.includes(r.product.Id)
        );
    }

    get hasSelectedProducts() {
        return this.selectedProductIds.length > 0;
    }

    get selectedCountLabel() {
        return `${this.selectedProductIds.length} selected`;
    }

    get estimatedMonthly() {
        let total = 0;
        this.selectedProductsList.forEach(r => {
            total += r.monthlyPrice || 0;
        });
        return '$' + total.toFixed(2);
    }

    handleCategoryChange(event) {
        this.selectedCategory = event.detail.value;
    }

    handleTierChange(event) {
        this.selectedTier = event.detail.value;
    }

    handleProductSelect(event) {
        const productId = event.detail;
        if (!this.selectedProductIds.includes(productId)) {
            this.selectedProductIds = [...this.selectedProductIds, productId];
        }
    }

    handleProductDeselect(event) {
        const productId = event.detail;
        this.selectedProductIds = this.selectedProductIds.filter(id => id !== productId);
    }

    handleGenerateQuote() {
        // Fire event with selected products for parent/quick action to handle
        this.dispatchEvent(new CustomEvent('productsselected', {
            detail: {
                productIds: this.selectedProductIds,
                leadId: this.leadRecord ? this.leadRecord.Id : null
            }
        }));
    }
}
