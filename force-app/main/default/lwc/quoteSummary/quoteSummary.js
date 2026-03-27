import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import getAllProducts from '@salesforce/apex/UKGProductService.getAllProducts';
import generateQuoteFromOpportunity from '@salesforce/apex/UKGProductService.generateQuoteFromOpportunity';
import addProductsToOpportunity from '@salesforce/apex/UKGProductService.addProductsToOpportunity';

export default class QuoteSummary extends LightningElement {
    @api recordId;
    @api leadId; // optional, kept for backward compatibility

    @track billingFrequency = 'monthly';
    @track quoteData = null;
    @track isLoading = false;
    @track allProducts = [];
    @track selectedProductIds = [];
    @track currentStep = 'select';

    connectedCallback() {
        this.loadProducts();
    }

    async loadProducts() {
        this.isLoading = true;
        try {
            this.allProducts = await getAllProducts();
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            this.isLoading = false;
        }
    }

    get isSelectStep() {
        return this.currentStep === 'select';
    }

    get isQuoteStep() {
        return this.currentStep === 'quote';
    }

    get productOptions() {
        return this.allProducts.map(r => {
            const selected = this.selectedProductIds.includes(r.product.Id);
            return {
                ...r,
                isSelected: selected,
                selectClass: selected ? 'product-select-item selected' : 'product-select-item'
            };
        });
    }

    get hasSelectedProducts() {
        return this.selectedProductIds.length > 0;
    }

    get selectedCount() {
        return this.selectedProductIds.length;
    }

    get disableGenerateQuote() {
        return this.selectedProductIds.length === 0;
    }

    handleProductToggle(event) {
        const productId = event.currentTarget.dataset.id;
        if (this.selectedProductIds.includes(productId)) {
            this.selectedProductIds = this.selectedProductIds.filter(id => id !== productId);
        } else {
            this.selectedProductIds = [...this.selectedProductIds, productId];
        }
    }

    async handleGenerateQuote() {
        this.isLoading = true;
        try {
            // Add products to Opportunity as line items
            await addProductsToOpportunity({
                opportunityId: this.recordId,
                productIds: this.selectedProductIds
            });

            // Generate the quote
            this.quoteData = await generateQuoteFromOpportunity({
                opportunityId: this.recordId,
                productIds: this.selectedProductIds,
                billingFrequency: this.billingFrequency
            });
            this.currentStep = 'quote';
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body ? error.body.message : 'Failed to generate quote.',
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
    }

    get hasData() {
        return this.quoteData != null;
    }

    get companyName() {
        return this.quoteData ? this.quoteData.companyName : '';
    }

    get contactName() {
        return this.quoteData ? this.quoteData.contactName : '';
    }

    get contactEmail() {
        return this.quoteData ? this.quoteData.contactEmail : '';
    }

    get leadIndustry() {
        return this.quoteData ? this.quoteData.industry : '';
    }

    get employeeCount() {
        return this.quoteData ? this.quoteData.employeeCount : 0;
    }

    get jobTitle() {
        return this.quoteData ? this.quoteData.contactTitle : '';
    }

    get quoteNumber() {
        return this.quoteData ? this.quoteData.quoteNumber : '';
    }

    get todayDate() {
        return new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    get validUntilDate() {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    get monthlyClass() {
        return this.billingFrequency === 'monthly' ? 'toggle-option active' : 'toggle-option';
    }

    get annualClass() {
        return this.billingFrequency === 'annual' ? 'toggle-option active' : 'toggle-option';
    }

    get billingLabel() {
        return this.billingFrequency === 'annual' ? 'Annual' : 'Monthly';
    }

    get billingPeriod() {
        return this.billingFrequency === 'annual' ? 'year' : 'month';
    }

    get lineItems() {
        if (!this.quoteData || !this.quoteData.lineItems) return [];
        return this.quoteData.lineItems.map(item => ({
            productId: item.productId,
            name: item.productName,
            category: item.category,
            tier: item.tier || '',
            unitPrice: Number(item.unitPrice).toFixed(2),
            lineTotal: Number(item.lineTotal).toLocaleString('en-US', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
            })
        }));
    }

    get subtotal() {
        if (!this.quoteData) return '0.00';
        return Number(this.quoteData.subtotal).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    get hasDiscount() {
        return this.quoteData && this.quoteData.discountPercent > 0;
    }

    get discountPercent() {
        return this.quoteData ? Number(this.quoteData.discountPercent).toFixed(0) : '0';
    }

    get discountAmount() {
        if (!this.quoteData) return '0.00';
        return Number(this.quoteData.discountAmount).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    get grandTotal() {
        if (!this.quoteData) return '0.00';
        return Number(this.quoteData.total).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    get perEmployeeRate() {
        if (!this.quoteData || !this.employeeCount) return '0.00';
        return (Number(this.quoteData.total) / this.employeeCount).toFixed(2);
    }

    handleBillingChange(event) {
        this.billingFrequency = event.currentTarget.dataset.value;
        if (this.selectedProductIds.length > 0) {
            this.handleGenerateQuote();
        }
    }

    handleBack() {
        this.currentStep = 'select';
    }

    handleClose() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    handleDownload() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Download Started',
                message: 'Your quote PDF is being generated...',
                variant: 'info'
            })
        );
    }

    handleSendEmail() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Email Sent',
                message: `Quote sent to ${this.contactEmail || 'client'}`,
                variant: 'success'
            })
        );
    }

    handleSubmitApproval() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Submitted for Approval',
                message: 'Quote has been submitted to the approval workflow.',
                variant: 'success'
            })
        );
    }
}
