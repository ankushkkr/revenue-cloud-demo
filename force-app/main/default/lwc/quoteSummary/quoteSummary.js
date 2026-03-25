import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class QuoteSummary extends LightningElement {
    @api leadData = '{}';
    @api selectedProducts = '[]';
    @track billingFrequency = 'monthly';

    get parsedLeadData() {
        try {
            return JSON.parse(this.leadData);
        } catch (e) {
            return {};
        }
    }

    get parsedProducts() {
        try {
            return JSON.parse(this.selectedProducts);
        } catch (e) {
            return [];
        }
    }

    get hasLeadInfo() {
        return this.parsedLeadData && this.parsedLeadData.companyName;
    }

    get employeeCount() {
        return this.parsedLeadData.employeeCount || 1000;
    }

    get quoteNumber() {
        return Math.floor(Math.random() * 90000 + 10000);
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

    get isMonthly() {
        return this.billingFrequency === 'monthly';
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
        return this.parsedProducts.map(p => {
            const unitPrice = this.billingFrequency === 'annual' ? p.annualPrice : p.monthlyPrice;
            return {
                productId: p.productId,
                name: p.name,
                category: p.category,
                tier: p.tier,
                unitPrice: unitPrice.toFixed(2),
                lineTotal: (unitPrice * this.employeeCount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })
            };
        });
    }

    get rawSubtotal() {
        return this.parsedProducts.reduce((sum, p) => {
            const price = this.billingFrequency === 'annual' ? p.annualPrice : p.monthlyPrice;
            return sum + (price * this.employeeCount);
        }, 0);
    }

    get subtotal() {
        return this.rawSubtotal.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    get discountRate() {
        let discount = 0;
        const count = this.parsedProducts.length;
        if (count >= 4) discount = 0.15;
        else if (count >= 2) discount = 0.10;

        if (this.employeeCount >= 5000) discount += 0.05;
        else if (this.employeeCount >= 1000) discount += 0.03;

        return discount;
    }

    get hasDiscount() {
        return this.discountRate > 0;
    }

    get discountPercent() {
        return (this.discountRate * 100).toFixed(0);
    }

    get rawDiscountAmount() {
        return this.rawSubtotal * this.discountRate;
    }

    get discountAmount() {
        return this.rawDiscountAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    get rawGrandTotal() {
        return this.rawSubtotal - this.rawDiscountAmount;
    }

    get grandTotal() {
        return this.rawGrandTotal.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    get perEmployeeRate() {
        if (this.employeeCount === 0) return '0.00';
        return (this.rawGrandTotal / this.employeeCount).toFixed(2);
    }

    handleBillingChange(event) {
        this.billingFrequency = event.currentTarget.dataset.value;
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
                message: `Quote sent to ${this.parsedLeadData.contactEmail || 'client'}`,
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
