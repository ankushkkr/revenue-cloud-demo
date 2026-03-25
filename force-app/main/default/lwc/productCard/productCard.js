import { LightningElement, api } from 'lwc';

export default class ProductCard extends LightningElement {
    @api product;
    @api matchScore = 0;
    @api matchLabel = '';
    @api isSelected = false;

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

    get tierBadgeClass() {
        if (this.product.tier === 'Enterprise') return 'tier-enterprise';
        if (this.product.tier === 'Add-On') return 'tier-addon';
        return 'tier-mid';
    }

    handleSelect() {
        this.dispatchEvent(new CustomEvent('select', {
            detail: this.product.productId
        }));
    }

    handleDeselect() {
        this.dispatchEvent(new CustomEvent('deselect', {
            detail: this.product.productId
        }));
    }
}
