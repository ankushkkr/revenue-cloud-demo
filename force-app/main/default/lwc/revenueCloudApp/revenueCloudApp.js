import { LightningElement, track } from 'lwc';

export default class RevenueCloudApp extends LightningElement {
    @track currentStep = 'home';
    @track leadData = {};
    @track selectedProducts = [];

    get isHome() {
        return this.currentStep === 'home';
    }

    get isLead() {
        return this.currentStep === 'lead';
    }

    get isProducts() {
        return this.currentStep === 'products';
    }

    get isQuote() {
        return this.currentStep === 'quote';
    }

    get leadDataJson() {
        return JSON.stringify(this.leadData);
    }

    get selectedProductsJson() {
        return JSON.stringify(this.selectedProducts);
    }

    handleStepClick(event) {
        this.currentStep = event.target.value;
    }

    goToLead() {
        this.currentStep = 'lead';
    }

    goToProducts() {
        this.currentStep = 'products';
    }

    goToQuote() {
        this.currentStep = 'quote';
    }

    handleLeadSubmit(event) {
        this.leadData = event.detail;
        this.currentStep = 'products';
    }

    handleProductsSelected(event) {
        this.selectedProducts = event.detail;
        this.currentStep = 'quote';
    }
}
