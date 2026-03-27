import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';

import COMPANY_FIELD from '@salesforce/schema/Lead.Company';
import INDUSTRY_FIELD from '@salesforce/schema/Lead.Industry';
import EMPLOYEE_COUNT_FIELD from '@salesforce/schema/Lead.Employee_Count__c';
import COMPANY_SIZE_FIELD from '@salesforce/schema/Lead.Company_Size__c';
import REQUIREMENTS_FIELD from '@salesforce/schema/Lead.Requirements__c';
import NOTES_FIELD from '@salesforce/schema/Lead.Additional_Notes__c';

const FIELDS = [COMPANY_FIELD, INDUSTRY_FIELD, EMPLOYEE_COUNT_FIELD, COMPANY_SIZE_FIELD, REQUIREMENTS_FIELD, NOTES_FIELD];

export default class LeadIntakeForm extends LightningElement {
    @api recordId;
    @track selectedRequirements = [];
    @track isSubmitting = false;

    industry = '';
    employeeCount = '';
    companySize = '';
    notes = '';

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredLead({ data, error }) {
        if (data) {
            this.industry = getFieldValue(data, INDUSTRY_FIELD) || '';
            this.employeeCount = getFieldValue(data, EMPLOYEE_COUNT_FIELD) || '';
            this.companySize = getFieldValue(data, COMPANY_SIZE_FIELD) || '';
            this.notes = getFieldValue(data, NOTES_FIELD) || '';
            const reqs = getFieldValue(data, REQUIREMENTS_FIELD);
            this.selectedRequirements = reqs ? reqs.split(',').map(r => r.trim()) : [];
        }
        if (error) {
            console.error('Error loading lead:', error);
        }
    }

    get industryOptions() {
        return [
            { label: 'Healthcare', value: 'Healthcare' },
            { label: 'Manufacturing', value: 'Manufacturing' },
            { label: 'Retail', value: 'Retail' },
            { label: 'Financial Services', value: 'Financial Services' },
            { label: 'Technology', value: 'Technology' },
            { label: 'Hospitality', value: 'Hospitality' },
            { label: 'Education', value: 'Education' },
            { label: 'Government', value: 'Government' },
            { label: 'Logistics', value: 'Logistics' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get companySizeOptions() {
        return [
            { label: 'Small (1-99)', value: 'small' },
            { label: 'Mid-Market (100-999)', value: 'mid-market' },
            { label: 'Enterprise (1,000-9,999)', value: 'enterprise' },
            { label: 'Large Enterprise (10,000+)', value: 'large-enterprise' }
        ];
    }

    get requirementOptions() {
        const reqs = [
            { id: 'payroll', label: 'Payroll Processing', icon: 'utility:moneybag' },
            { id: 'hr', label: 'Core HR Management', icon: 'utility:people' },
            { id: 'time-tracking', label: 'Time & Attendance', icon: 'utility:clock' },
            { id: 'scheduling', label: 'Workforce Scheduling', icon: 'utility:event' },
            { id: 'talent', label: 'Talent Management', icon: 'utility:favorite' },
            { id: 'recruiting', label: 'Recruiting & Onboarding', icon: 'utility:adduser' },
            { id: 'analytics', label: 'People Analytics', icon: 'utility:chart' },
            { id: 'engagement', label: 'Employee Engagement', icon: 'utility:like' },
            { id: 'compliance', label: 'Compliance Management', icon: 'utility:shield' },
            { id: 'financial-wellness', label: 'Financial Wellness', icon: 'utility:money' },
            { id: 'communication', label: 'Internal Communications', icon: 'utility:chat' },
            { id: 'service-delivery', label: 'HR Service Delivery', icon: 'utility:headset' }
        ];

        return reqs.map(r => ({
            ...r,
            selected: this.selectedRequirements.includes(r.id),
            className: this.selectedRequirements.includes(r.id) ? 'req-chip selected' : 'req-chip'
        }));
    }

    handleIndustry(event) { this.industry = event.detail.value; }
    handleEmployeeCount(event) { this.employeeCount = event.target.value; }
    handleCompanySize(event) { this.companySize = event.detail.value; }
    handleNotes(event) { this.notes = event.target.value; }

    handleRequirementToggle(event) {
        const reqId = event.currentTarget.dataset.id;
        if (this.selectedRequirements.includes(reqId)) {
            this.selectedRequirements = this.selectedRequirements.filter(r => r !== reqId);
        } else {
            this.selectedRequirements = [...this.selectedRequirements, reqId];
        }
    }

    async handleSubmit() {
        if (this.selectedRequirements.length === 0) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing Requirements',
                    message: 'Please select at least one requirement.',
                    variant: 'warning'
                })
            );
            return;
        }

        this.isSubmitting = true;

        try {
            const fields = {};
            fields.Id = this.recordId;
            fields[INDUSTRY_FIELD.fieldApiName] = this.industry;
            fields[EMPLOYEE_COUNT_FIELD.fieldApiName] = parseInt(this.employeeCount, 10) || null;
            fields[COMPANY_SIZE_FIELD.fieldApiName] = this.companySize;
            fields[REQUIREMENTS_FIELD.fieldApiName] = this.selectedRequirements.join(',');
            fields[NOTES_FIELD.fieldApiName] = this.notes;

            await updateRecord({ fields });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Lead Enriched',
                    message: 'Discovery data saved to Lead record.',
                    variant: 'success'
                })
            );
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Saving Lead',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                })
            );
        } finally {
            this.isSubmitting = false;
        }
    }
}
