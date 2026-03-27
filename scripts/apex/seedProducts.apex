// Seed UKG Products into Product2
// Run via: sf apex run --file scripts/apex/seedProducts.apex

// Delete existing UKG products to avoid duplicates
List<Product2> existing = [SELECT Id FROM Product2 WHERE ProductCode LIKE 'UKG-%'];
if (!existing.isEmpty()) {
    delete existing;
}

// Create products with pricing
List<Product2> products = new List<Product2>();

products.add(new Product2(
    Name = 'UKG Pro', ProductCode = 'UKG-PRO', IsActive = true,
    Description = 'Comprehensive human capital management suite for enterprise organizations. Covers HR, payroll, talent, and workforce management in a single platform.',
    Category__c = 'HCM', Tier__c = 'Enterprise', Min_Employees__c = 500,
    Tags__c = 'enterprise,payroll,hr,talent,analytics',
    Features__c = 'Core HR & Benefits;Payroll Processing;Talent Management;People Analytics;Employee Self-Service',
    Monthly_Price__c = 22.00, Annual_Price__c = 240.00
));

products.add(new Product2(
    Name = 'UKG Ready', ProductCode = 'UKG-READY', IsActive = true,
    Description = 'Flexible HR, talent, payroll, and time solution built for small to mid-size businesses.',
    Category__c = 'HCM', Tier__c = 'Mid-Market', Min_Employees__c = 50,
    Tags__c = 'mid-market,payroll,hr,time-tracking,recruiting',
    Features__c = 'HR Management;Payroll;Time & Attendance;Recruiting;Onboarding',
    Monthly_Price__c = 14.00, Annual_Price__c = 150.00
));

products.add(new Product2(
    Name = 'UKG Workforce Central', ProductCode = 'UKG-WFC', IsActive = true,
    Description = 'Advanced workforce management solution for complex scheduling, labor compliance, and operational visibility.',
    Category__c = 'Workforce Management', Tier__c = 'Enterprise', Min_Employees__c = 200,
    Tags__c = 'enterprise,scheduling,compliance,workforce,time-tracking',
    Features__c = 'Advanced Scheduling;Time & Attendance;Labor Analytics;Compliance Management;Absence Management',
    Monthly_Price__c = 12.00, Annual_Price__c = 130.00
));

products.add(new Product2(
    Name = 'UKG Pro Workforce Management', ProductCode = 'UKG-PWM', IsActive = true,
    Description = 'Next-generation AI-powered workforce management with real-time insights and intelligent scheduling.',
    Category__c = 'Workforce Management', Tier__c = 'Enterprise', Min_Employees__c = 300,
    Tags__c = 'enterprise,ai,scheduling,analytics,workforce',
    Features__c = 'AI-Powered Scheduling;Real-Time Analytics;Mobile Access;Forecasting;Task Management',
    Monthly_Price__c = 16.00, Annual_Price__c = 175.00
));

products.add(new Product2(
    Name = 'UKG Talk', ProductCode = 'UKG-TALK', IsActive = true,
    Description = 'Social communication and engagement platform that connects employees and builds culture.',
    Category__c = 'Employee Experience', Tier__c = 'Add-On', Min_Employees__c = 10,
    Tags__c = 'engagement,communication,culture,recognition',
    Features__c = 'Social Feed;Surveys & Polls;Recognition;Announcements;Team Channels',
    Monthly_Price__c = 4.00, Annual_Price__c = 42.00
));

products.add(new Product2(
    Name = 'UKG Wallet', ProductCode = 'UKG-WALLET', IsActive = true,
    Description = 'On-demand pay and financial wellness solution giving employees early access to earned wages.',
    Category__c = 'Financial Wellness', Tier__c = 'Add-On', Min_Employees__c = 10,
    Tags__c = 'financial-wellness,payroll,retention,benefits',
    Features__c = 'Earned Wage Access;Financial Dashboard;Savings Goals;Pay Notifications;Spending Insights',
    Monthly_Price__c = 3.00, Annual_Price__c = 30.00
));

products.add(new Product2(
    Name = 'UKG HR Service Delivery', ProductCode = 'UKG-HRSD', IsActive = true,
    Description = 'Centralized knowledge base and case management system for HR teams.',
    Category__c = 'HR Operations', Tier__c = 'Add-On', Min_Employees__c = 200,
    Tags__c = 'hr,service-delivery,knowledge-management,enterprise',
    Features__c = 'Knowledge Base;Case Management;Employee Portal;SLA Tracking;Document Management',
    Monthly_Price__c = 6.00, Annual_Price__c = 65.00
));

products.add(new Product2(
    Name = 'UKG Strategic Workforce Planning', ProductCode = 'UKG-SWP', IsActive = true,
    Description = 'Data-driven workforce planning and analytics for forecasting talent needs and scenario modeling.',
    Category__c = 'Analytics', Tier__c = 'Enterprise', Min_Employees__c = 500,
    Tags__c = 'enterprise,analytics,planning,talent,strategy',
    Features__c = 'Workforce Modeling;Scenario Planning;Skills Gap Analysis;Headcount Forecasting;Executive Dashboards',
    Monthly_Price__c = 8.00, Annual_Price__c = 85.00
));

insert products;
System.debug('Successfully created ' + products.size() + ' products with pricing.');
