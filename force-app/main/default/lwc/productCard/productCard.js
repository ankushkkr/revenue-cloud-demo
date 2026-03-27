import { LightningElement, api } from 'lwc';

export default class ProductCard extends LightningElement {
    @api product;
    @api monthlyPrice = 0;
    @api annualPrice = 0;
    @api featureList = [];
    @api matchScore = 0;
    @api matchLabel = '';
    @api isSelected = false;
    @api reasons = [];
    @api affinityProducts = [];

    get cardClass() {
        let cls = 'product-card';
        if (this.isSelected) cls += ' selected';
        if (this.matchLabel === 'Best Match') cls += ' best-match';
        return cls;
    }

    get matchBadgeClass() {
        if (this.matchLabel === 'Best Match') return 'match-badge best';
        if (this.matchLabel === 'Strong Match') return 'match-badge strong';
        return 'match-badge good';
    }

    get matchIcon() {
        if (this.matchLabel === 'Best Match') return 'utility:favorite';
        if (this.matchLabel === 'Strong Match') return 'utility:like';
        return 'utility:check';
    }

    get productName() {
        return this.product ? this.product.Name : '';
    }

    get productDescription() {
        return this.product ? this.product.Description : '';
    }

    get productCategory() {
        return this.product ? this.product.Category__c : '';
    }

    get productTier() {
        return this.product ? this.product.Tier__c : '';
    }

    get tierBadgeClass() {
        const tier = this.productTier;
        if (tier === 'Enterprise') return 'tier-enterprise';
        if (tier === 'Add-On') return 'tier-addon';
        return 'tier-mid';
    }

    get formattedMonthlyPrice() {
        return this.monthlyPrice || 0;
    }

    get formattedAnnualPrice() {
        return this.annualPrice || 0;
    }

    get displayFeatures() {
        return this.featureList || [];
    }

    get hasReasons() {
        return this.reasons && this.reasons.length > 0;
    }

    get topReasons() {
        return (this.reasons || []).slice(0, 3);
    }

    get hasAffinityProducts() {
        return this.affinityProducts && this.affinityProducts.length > 0;
    }

    handleSelect() {
        this.dispatchEvent(new CustomEvent('select', {
            detail: this.product.Id
        }));
    }

    handleDeselect() {
        this.dispatchEvent(new CustomEvent('deselect', {
            detail: this.product.Id
        }));
    }
}
