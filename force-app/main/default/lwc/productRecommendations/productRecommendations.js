import { LightningElement, api, track, wire } from 'lwc';
import getRecommendedProducts from '@salesforce/apex/UKGProductService.getRecommendedProducts';
import getAllProducts from '@salesforce/apex/UKGProductService.getAllProducts';

export default class ProductRecommendations extends LightningElement {
    @api leadData = '{}';
    @track recommendations = [];
    @track selectedProductIds = [];
    @track selectedCategory = '';
    @track selectedTier = '';
    @track isLoading = true;

    get parsedLeadData() {
        try {
            return JSON.parse(this.leadData);
        } catch (e) {
            return {};
        }
    }

    get hasLeadData() {
        const data = this.parsedLeadData;
        return data && data.companyName;
    }

    connectedCallback() {
        this.loadProducts();
    }

    async loadProducts() {
        this.isLoading = true;
        try {
            const data = this.parsedLeadData;
            if (data && data.requirements && data.requirements.length > 0) {
                const result = await getRecommendedProducts({
                    industry: data.industry || '',
                    employeeCount: data.employeeCount || 0,
                    requirements: data.requirements || []
                });
                this.recommendations = result.map(r => ({
                    ...r,
                    isSelected: false
                }));
            } else {
                const products = await getAllProducts();
                this.recommendations = products.map(p => ({
                    product: p,
                    matchScore: 0,
                    matchLabel: '',
                    isSelected: false
                }));
            }
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            this.isLoading = false;
        }
    }

    get categoryOptions() {
        const cats = new Set();
        this.recommendations.forEach(r => cats.add(r.product.category));
        const options = [{ label: 'All Categories', value: '' }];
        cats.forEach(c => options.push({ label: c, value: c }));
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
                if (this.selectedCategory && r.product.category !== this.selectedCategory) return false;
                if (this.selectedTier && r.product.tier !== this.selectedTier) return false;
                return true;
            })
            .map(r => ({
                ...r,
                isSelected: this.selectedProductIds.includes(r.product.productId)
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
            this.selectedProductIds.includes(r.product.productId)
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
            total += r.product.monthlyPrice;
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
        const selectedProducts = this.selectedProductsList.map(r => r.product);
        this.dispatchEvent(new CustomEvent('productsselected', {
            detail: selectedProducts
        }));
    }
}
