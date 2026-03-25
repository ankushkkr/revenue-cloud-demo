import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class LeadIntakeForm extends LightningElement {
    companyName = '';
    industry = '';
    employeeCount = '';
    companySize = '';
    contactName = '';
    contactEmail = '';
    contactPhone = '';
    jobTitle = '';
    notes = '';

    @track selectedRequirements = [];

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

    handleCompanyName(event) { this.companyName = event.target.value; }
    handleIndustry(event) { this.industry = event.detail.value; }
    handleEmployeeCount(event) { this.employeeCount = event.target.value; }
    handleCompanySize(event) { this.companySize = event.detail.value; }
    handleContactName(event) { this.contactName = event.target.value; }
    handleContactEmail(event) { this.contactEmail = event.target.value; }
    handleContactPhone(event) { this.contactPhone = event.target.value; }
    handleJobTitle(event) { this.jobTitle = event.target.value; }
    handleNotes(event) { this.notes = event.target.value; }

    handleRequirementToggle(event) {
        const reqId = event.currentTarget.dataset.id;
        if (this.selectedRequirements.includes(reqId)) {
            this.selectedRequirements = this.selectedRequirements.filter(r => r !== reqId);
        } else {
            this.selectedRequirements = [...this.selectedRequirements, reqId];
        }
    }

    handleSubmit() {
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-combobox')]
            .reduce((valid, input) => {
                input.reportValidity();
                return valid && input.checkValidity();
            }, true);

        if (!allValid) {
            return;
        }

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

        const leadData = {
            companyName: this.companyName,
            industry: this.industry,
            employeeCount: parseInt(this.employeeCount, 10),
            companySize: this.companySize,
            contactName: this.contactName,
            contactEmail: this.contactEmail,
            contactPhone: this.contactPhone,
            jobTitle: this.jobTitle,
            requirements: this.selectedRequirements,
            notes: this.notes
        };

        this.dispatchEvent(new CustomEvent('submitlead', { detail: leadData }));
    }
}
