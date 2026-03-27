import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

import INDUSTRY_FIELD from '@salesforce/schema/Lead.Industry';
import EMPLOYEE_COUNT_FIELD from '@salesforce/schema/Lead.Employee_Count__c';
import COMPANY_SIZE_FIELD from '@salesforce/schema/Lead.Company_Size__c';
import REQUIREMENTS_FIELD from '@salesforce/schema/Lead.Requirements__c';
import NOTES_FIELD from '@salesforce/schema/Lead.Additional_Notes__c';
import COMPANY_FIELD from '@salesforce/schema/Lead.Company';
import EMAIL_FIELD from '@salesforce/schema/Lead.Email';
import PHONE_FIELD from '@salesforce/schema/Lead.Phone';

const FIELDS = [
    INDUSTRY_FIELD, EMPLOYEE_COUNT_FIELD, COMPANY_SIZE_FIELD,
    REQUIREMENTS_FIELD, NOTES_FIELD, COMPANY_FIELD, EMAIL_FIELD, PHONE_FIELD
];

export default class LeadReadinessScore extends LightningElement {
    @api recordId;
    leadData = null;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredLead({ data, error }) {
        if (data) {
            this.leadData = data;
        }
    }

    get checks() {
        if (!this.leadData) return [];

        return [
            {
                label: 'Company Name',
                done: !!getFieldValue(this.leadData, COMPANY_FIELD),
                icon: 'utility:company',
                category: 'basic'
            },
            {
                label: 'Email Address',
                done: !!getFieldValue(this.leadData, EMAIL_FIELD),
                icon: 'utility:email',
                category: 'basic'
            },
            {
                label: 'Phone Number',
                done: !!getFieldValue(this.leadData, PHONE_FIELD),
                icon: 'utility:call',
                category: 'basic'
            },
            {
                label: 'Industry',
                done: !!getFieldValue(this.leadData, INDUSTRY_FIELD),
                icon: 'utility:world',
                category: 'discovery'
            },
            {
                label: 'Employee Count',
                done: !!getFieldValue(this.leadData, EMPLOYEE_COUNT_FIELD),
                icon: 'utility:people',
                category: 'discovery'
            },
            {
                label: 'Company Size',
                done: !!getFieldValue(this.leadData, COMPANY_SIZE_FIELD),
                icon: 'utility:chart',
                category: 'discovery'
            },
            {
                label: 'Requirements',
                done: !!getFieldValue(this.leadData, REQUIREMENTS_FIELD),
                icon: 'utility:task',
                category: 'discovery'
            },
            {
                label: 'Additional Notes',
                done: !!getFieldValue(this.leadData, NOTES_FIELD),
                icon: 'utility:note',
                category: 'discovery'
            }
        ].map(c => ({
            ...c,
            className: c.done ? 'check-item done' : 'check-item pending',
            statusIcon: c.done ? 'utility:check' : 'utility:close',
            statusClass: c.done ? 'status-done' : 'status-pending'
        }));
    }

    get completedCount() {
        return this.checks.filter(c => c.done).length;
    }

    get totalCount() {
        return this.checks.length;
    }

    get scorePercent() {
        if (this.totalCount === 0) return 0;
        return Math.round((this.completedCount / this.totalCount) * 100);
    }

    get scoreLabel() {
        const pct = this.scorePercent;
        if (pct === 100) return 'Ready for Recommendations';
        if (pct >= 75) return 'Almost Ready';
        if (pct >= 50) return 'Partially Enriched';
        if (pct >= 25) return 'Getting Started';
        return 'Needs Discovery Data';
    }

    get scoreColorClass() {
        const pct = this.scorePercent;
        if (pct === 100) return 'score-complete';
        if (pct >= 75) return 'score-high';
        if (pct >= 50) return 'score-medium';
        return 'score-low';
    }

    get ringStyle() {
        const pct = this.scorePercent;
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (pct / 100) * circumference;
        return `stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};`;
    }

    get ringTrackStyle() {
        const circumference = 2 * Math.PI * 54;
        return `stroke-dasharray: ${circumference}; stroke-dashoffset: 0;`;
    }

    get missingItems() {
        return this.checks.filter(c => !c.done);
    }

    get hasMissing() {
        return this.missingItems.length > 0;
    }

    get discoveryChecks() {
        return this.checks.filter(c => c.category === 'discovery');
    }

    get basicChecks() {
        return this.checks.filter(c => c.category === 'basic');
    }

    get requirementTags() {
        if (!this.leadData) return [];
        const reqs = getFieldValue(this.leadData, REQUIREMENTS_FIELD);
        if (!reqs) return [];
        return reqs.split(',').map(r => r.trim());
    }

    get hasRequirements() {
        return this.requirementTags.length > 0;
    }

    get requirementCount() {
        return this.requirementTags.length;
    }
}
