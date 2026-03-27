import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class RevenueCloudApp extends NavigationMixin(LightningElement) {

    goToLead() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Lead_Intake'
            }
        });
    }

    goToProducts() {
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Product_Recommendations'
            }
        });
    }
}
