import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getRecommendedProducts from '@salesforce/apex/UKGProductService.getRecommendedProducts';
import getAllProducts from '@salesforce/apex/UKGProductService.getAllProducts';

import INDUSTRY_FIELD from '@salesforce/schema/Lead.Industry';
import EMPLOYEE_COUNT_FIELD from '@salesforce/schema/Lead.Employee_Count__c';
import REQUIREMENTS_FIELD from '@salesforce/schema/Lead.Requirements__c';

const FIELDS = [INDUSTRY_FIELD, EMPLOYEE_COUNT_FIELD, REQUIREMENTS_FIELD];

export default class LeadProductPreview extends LightningElement {
    @api recordId;
    @track recommendations = [];
    @track isLoading = true;
    @track hasError = false;

    industry = '';
    employeeCount = 0;
    requirements = [];

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredLead({ data, error }) {
        if (data) {
            this.industry = getFieldValue(data, INDUSTRY_FIELD) || '';
            this.employeeCount = getFieldValue(data, EMPLOYEE_COUNT_FIELD) || 0;
            const reqs = getFieldValue(data, REQUIREMENTS_FIELD);
            this.requirements = reqs ? reqs.split(',').map(r => r.trim()) : [];
            this.loadProducts();
        }
        if (error) {
            this.hasError = true;
            this.isLoading = false;
        }
    }

    async loadProducts() {
        this.isLoading = true;
        try {
            if (this.requirements.length > 0) {
                const results = await getRecommendedProducts({
                    industry: this.industry,
                    employeeCount: this.employeeCount,
                    requirements: this.requirements
                });
                this.recommendations = results.slice(0, 3);
            } else {
                this.recommendations = [];
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.hasError = true;
        } finally {
            this.isLoading = false;
        }
    }

    get hasRecommendations() {
        return this.recommendations.length > 0;
    }

    get noData() {
        return !this.isLoading && !this.hasRecommendations && !this.hasError;
    }

    get topProducts() {
        return this.recommendations.map(r => ({
            id: r.product.Id,
            name: r.product.Name,
            category: r.product.Category__c,
            tier: r.product.Tier__c,
            monthlyPrice: r.monthlyPrice,
            matchScore: r.matchScore,
            matchLabel: r.matchLabel,
            topReason: r.reasons && r.reasons.length > 0 ? r.reasons[0].text : '',
            topReasonIcon: r.reasons && r.reasons.length > 0 ? r.reasons[0].icon : 'utility:check',
            matchBadgeClass: this.getBadgeClass(r.matchLabel),
            scoreBarStyle: `width: ${r.matchScore}%`
        }));
    }

    getBadgeClass(label) {
        if (label === 'Best Match') return 'badge best';
        if (label === 'Strong Match') return 'badge strong';
        return 'badge good';
    }
}
