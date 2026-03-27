import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRecommendedProducts from '@salesforce/apex/UKGProductService.getRecommendedProducts';
import getAllProducts from '@salesforce/apex/UKGProductService.getAllProducts';
import getLeadById from '@salesforce/apex/UKGProductService.getLeadById';
import getOpportunityById from '@salesforce/apex/UKGProductService.getOpportunityById';
import addProductsToOpportunity from '@salesforce/apex/UKGProductService.addProductsToOpportunity';

export default class ProductRecommendations extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;
    @api leadId;

    @track recommendations = [];
    @track selectedProductIds = [];
    @track selectedCategory = '';
    @track selectedTier = '';
    @track isLoading = true;

    // Context info for display
    contextCompany = '';
    contextEmployeeCount = '';
    contextIndustry = '';
    hasContext = false;

    connectedCallback() {
        this.loadData();
    }

    get isOnOpportunity() {
        if (this.objectApiName) {
            return this.objectApiName === 'Opportunity';
        }
        return this.recordId && String(this.recordId).startsWith('006');
    }

    get isOnLead() {
        if (this.objectApiName) {
            return this.objectApiName === 'Lead';
        }
        return this.recordId && String(this.recordId).startsWith('00Q');
    }

    async loadData() {
        this.isLoading = true;
        try {
            let industry = '';
            let employeeCount = 0;
            let requirements = [];

            if (this.isOnLead && this.recordId) {
                // On Lead page — use Lead discovery data
                const lead = await getLeadById({ leadId: this.recordId });
                industry = lead.Industry || '';
                employeeCount = lead.Employee_Count__c || 0;
                requirements = lead.Requirements__c
                    ? lead.Requirements__c.split(',').map(r => r.trim())
                    : [];
                this.contextCompany = lead.Company || '';
                this.contextEmployeeCount = employeeCount;
                this.contextIndustry = industry;
                this.hasContext = !!lead.Requirements__c;

            } else if (this.isOnOpportunity && this.recordId) {
                // On Opportunity page — use Opportunity discovery fields
                const opp = await getOpportunityById({ oppId: this.recordId });
                industry = opp.Industry__c || (opp.Account ? opp.Account.Industry : '') || '';
                employeeCount = opp.Employee_Count__c ||
                    (opp.Account ? opp.Account.NumberOfEmployees : 0) || 0;
                requirements = opp.Requirements__c
                    ? opp.Requirements__c.split(',').map(r => r.trim())
                    : [];
                this.contextCompany = opp.Account ? opp.Account.Name : opp.Name;
                this.contextEmployeeCount = employeeCount;
                this.contextIndustry = industry;
                this.hasContext = !!opp.Requirements__c;

            } else if (this.leadId) {
                // Explicit leadId passed as property
                const lead = await getLeadById({ leadId: this.leadId });
                industry = lead.Industry || '';
                employeeCount = lead.Employee_Count__c || 0;
                requirements = lead.Requirements__c
                    ? lead.Requirements__c.split(',').map(r => r.trim())
                    : [];
                this.contextCompany = lead.Company || '';
                this.contextEmployeeCount = employeeCount;
                this.contextIndustry = industry;
                this.hasContext = !!lead.Requirements__c;
            }

            if (requirements.length > 0) {
                this.recommendations = await getRecommendedProducts({
                    industry: industry,
                    employeeCount: employeeCount,
                    requirements: requirements
                });
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
        return this.hasContext;
    }

    get leadCompanyName() {
        return this.contextCompany;
    }

    get leadEmployeeCount() {
        return this.contextEmployeeCount;
    }

    get leadIndustry() {
        return this.contextIndustry;
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

    get actionButtonLabel() {
        return this.isOnOpportunity ? 'Add to Opportunity' : 'Generate Quote';
    }

    handleCategoryChange(event) {
        this.selectedCategory = event.detail.value;
    }

    handleTierChange(event) {
        this.selectedTier = event.detail.value;
    }

    async handleProductSelect(event) {
        const productId = event.detail;
        if (!this.selectedProductIds.includes(productId)) {
            this.selectedProductIds = [...this.selectedProductIds, productId];
        }

        if (this.isOnOpportunity && this.recordId) {
            try {
                const result = await addProductsToOpportunity({
                    opportunityId: this.recordId,
                    productIds: [productId]
                });
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Product Added',
                        message: result,
                        variant: 'success'
                    })
                );
            } catch (error) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body ? error.body.message : 'Failed to add product.',
                        variant: 'error'
                    })
                );
            }
        }
    }

    handleProductDeselect(event) {
        const productId = event.detail;
        this.selectedProductIds = this.selectedProductIds.filter(id => id !== productId);
    }

    async handleGenerateQuote() {
        if (this.isOnOpportunity && this.recordId) {
            try {
                const result = await addProductsToOpportunity({
                    opportunityId: this.recordId,
                    productIds: this.selectedProductIds
                });
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Products Added',
                        message: result,
                        variant: 'success'
                    })
                );
                this.selectedProductIds = [];
            } catch (error) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body ? error.body.message : 'Failed to add products.',
                        variant: 'error'
                    })
                );
            }
        } else {
            this.dispatchEvent(new CustomEvent('productsselected', {
                detail: {
                    productIds: this.selectedProductIds
                }
            }));
        }
    }
}
