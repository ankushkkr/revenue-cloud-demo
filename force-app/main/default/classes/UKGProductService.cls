public with sharing class UKGProductService {

    @AuraEnabled(cacheable=true)
    public static List<ProductRecommendation> getRecommendedProducts(
        String industry,
        Integer employeeCount,
        List<String> requirements
    ) {
        List<ProductRecommendation> recommendations = new List<ProductRecommendation>();
        List<UKGProduct> allProducts = getAllProducts();

        for (UKGProduct prod : allProducts) {
            Integer score = calculateMatchScore(prod, industry, employeeCount, requirements);
            if (score > 0) {
                ProductRecommendation rec = new ProductRecommendation();
                rec.product = prod;
                rec.matchScore = score;
                rec.matchLabel = getMatchLabel(score);
                recommendations.add(rec);
            }
        }

        recommendations.sort();
        return recommendations;
    }

    @AuraEnabled(cacheable=true)
    public static List<UKGProduct> getAllProducts() {
        List<UKGProduct> products = new List<UKGProduct>();

        products.add(createProduct(
            'UKG-PRO', 'UKG Pro', 'HCM', 'Enterprise',
            'Comprehensive human capital management suite for enterprise organizations. Covers HR, payroll, talent, and workforce management in a single platform.',
            new List<String>{'Core HR & Benefits', 'Payroll Processing', 'Talent Management', 'People Analytics', 'Employee Self-Service'},
            22.00, 240.00, 500,
            new List<String>{'enterprise', 'payroll', 'hr', 'talent', 'analytics'}
        ));

        products.add(createProduct(
            'UKG-READY', 'UKG Ready', 'HCM', 'Mid-Market',
            'Flexible HR, talent, payroll, and time solution built for small to mid-size businesses.',
            new List<String>{'HR Management', 'Payroll', 'Time & Attendance', 'Recruiting', 'Onboarding'},
            14.00, 150.00, 50,
            new List<String>{'mid-market', 'payroll', 'hr', 'time-tracking', 'recruiting'}
        ));

        products.add(createProduct(
            'UKG-WFC', 'UKG Workforce Central', 'Workforce Management', 'Enterprise',
            'Advanced workforce management solution for complex scheduling, labor compliance, and operational visibility.',
            new List<String>{'Advanced Scheduling', 'Time & Attendance', 'Labor Analytics', 'Compliance Management', 'Absence Management'},
            12.00, 130.00, 200,
            new List<String>{'enterprise', 'scheduling', 'compliance', 'workforce', 'time-tracking'}
        ));

        products.add(createProduct(
            'UKG-PWM', 'UKG Pro Workforce Management', 'Workforce Management', 'Enterprise',
            'Next-generation AI-powered workforce management with real-time insights and intelligent scheduling.',
            new List<String>{'AI-Powered Scheduling', 'Real-Time Analytics', 'Mobile Access', 'Forecasting', 'Task Management'},
            16.00, 175.00, 300,
            new List<String>{'enterprise', 'ai', 'scheduling', 'analytics', 'workforce'}
        ));

        products.add(createProduct(
            'UKG-TALK', 'UKG Talk', 'Employee Experience', 'Add-On',
            'Social communication and engagement platform that connects employees and builds culture.',
            new List<String>{'Social Feed', 'Surveys & Polls', 'Recognition', 'Announcements', 'Team Channels'},
            4.00, 42.00, 10,
            new List<String>{'engagement', 'communication', 'culture', 'recognition'}
        ));

        products.add(createProduct(
            'UKG-WALLET', 'UKG Wallet', 'Financial Wellness', 'Add-On',
            'On-demand pay and financial wellness solution giving employees early access to earned wages.',
            new List<String>{'Earned Wage Access', 'Financial Dashboard', 'Savings Goals', 'Pay Notifications', 'Spending Insights'},
            3.00, 30.00, 10,
            new List<String>{'financial-wellness', 'payroll', 'retention', 'benefits'}
        ));

        products.add(createProduct(
            'UKG-HRSD', 'UKG HR Service Delivery', 'HR Operations', 'Add-On',
            'Centralized knowledge base and case management system for HR teams.',
            new List<String>{'Knowledge Base', 'Case Management', 'Employee Portal', 'SLA Tracking', 'Document Management'},
            6.00, 65.00, 200,
            new List<String>{'hr', 'service-delivery', 'knowledge-management', 'enterprise'}
        ));

        products.add(createProduct(
            'UKG-SWP', 'UKG Strategic Workforce Planning', 'Analytics', 'Enterprise',
            'Data-driven workforce planning and analytics for forecasting talent needs and scenario modeling.',
            new List<String>{'Workforce Modeling', 'Scenario Planning', 'Skills Gap Analysis', 'Headcount Forecasting', 'Executive Dashboards'},
            8.00, 85.00, 500,
            new List<String>{'enterprise', 'analytics', 'planning', 'talent', 'strategy'}
        ));

        return products;
    }

    @AuraEnabled
    public static Map<String, Object> generateQuote(
        String companyName,
        String contactName,
        String contactEmail,
        Integer employeeCount,
        List<String> productIds,
        String billingFrequency
    ) {
        List<UKGProduct> allProducts = getAllProducts();
        Map<String, UKGProduct> productMap = new Map<String, UKGProduct>();
        for (UKGProduct p : allProducts) {
            productMap.put(p.productId, p);
        }

        Decimal subtotal = 0;
        List<Map<String, Object>> lineItems = new List<Map<String, Object>>();

        for (String pid : productIds) {
            UKGProduct prod = productMap.get(pid);
            if (prod != null) {
                Decimal lineTotal;
                if (billingFrequency == 'annual') {
                    lineTotal = prod.annualPrice * employeeCount;
                } else {
                    lineTotal = prod.monthlyPrice * employeeCount;
                }
                subtotal += lineTotal;

                Map<String, Object> item = new Map<String, Object>();
                item.put('productId', prod.productId);
                item.put('productName', prod.name);
                item.put('category', prod.category);
                item.put('unitPrice', billingFrequency == 'annual' ? prod.annualPrice : prod.monthlyPrice);
                item.put('quantity', employeeCount);
                item.put('lineTotal', lineTotal);
                lineItems.add(item);
            }
        }

        Decimal discount = 0;
        if (productIds.size() >= 4) {
            discount = 0.15;
        } else if (productIds.size() >= 2) {
            discount = 0.10;
        }

        if (employeeCount >= 5000) {
            discount += 0.05;
        } else if (employeeCount >= 1000) {
            discount += 0.03;
        }

        Decimal discountAmount = subtotal * discount;
        Decimal total = subtotal - discountAmount;

        Map<String, Object> quote = new Map<String, Object>();
        quote.put('quoteNumber', 'QT-' + String.valueOf(Math.round(Math.random() * 90000 + 10000)));
        quote.put('companyName', companyName);
        quote.put('contactName', contactName);
        quote.put('contactEmail', contactEmail);
        quote.put('employeeCount', employeeCount);
        quote.put('billingFrequency', billingFrequency);
        quote.put('lineItems', lineItems);
        quote.put('subtotal', subtotal);
        quote.put('discountPercent', discount * 100);
        quote.put('discountAmount', discountAmount);
        quote.put('total', total);
        quote.put('createdDate', System.today().format());
        quote.put('validUntil', System.today().addDays(30).format());

        return quote;
    }

    private static UKGProduct createProduct(
        String productId, String name, String category, String tier,
        String description, List<String> features,
        Decimal monthlyPrice, Decimal annualPrice, Integer minEmployees,
        List<String> tags
    ) {
        UKGProduct prod = new UKGProduct();
        prod.productId = productId;
        prod.name = name;
        prod.category = category;
        prod.tier = tier;
        prod.description = description;
        prod.features = features;
        prod.monthlyPrice = monthlyPrice;
        prod.annualPrice = annualPrice;
        prod.minEmployees = minEmployees;
        prod.tags = tags;
        return prod;
    }

    private static Integer calculateMatchScore(
        UKGProduct product, String industry, Integer employeeCount, List<String> requirements
    ) {
        Integer score = 0;

        if (employeeCount >= product.minEmployees) {
            score += 20;
        } else if (employeeCount >= product.minEmployees * 0.5) {
            score += 10;
        }

        if (requirements != null) {
            Set<String> reqSet = new Set<String>(requirements);
            for (String tag : product.tags) {
                if (reqSet.contains(tag)) {
                    score += 15;
                }
            }
        }

        if (product.tier == 'Enterprise' && employeeCount >= 500) {
            score += 10;
        } else if (product.tier == 'Mid-Market' && employeeCount < 500) {
            score += 10;
        }

        if (industry == 'Healthcare' || industry == 'Manufacturing') {
            if (product.tags.contains('compliance') || product.tags.contains('scheduling')) {
                score += 10;
            }
        }
        if (industry == 'Retail' || industry == 'Hospitality') {
            if (product.tags.contains('scheduling') || product.tags.contains('time-tracking')) {
                score += 10;
            }
        }

        return score;
    }

    private static String getMatchLabel(Integer score) {
        if (score >= 60) return 'Best Match';
        if (score >= 40) return 'Strong Match';
        if (score >= 20) return 'Good Match';
        return 'Possible Match';
    }

    public class UKGProduct {
        @AuraEnabled public String productId;
        @AuraEnabled public String name;
        @AuraEnabled public String category;
        @AuraEnabled public String tier;
        @AuraEnabled public String description;
        @AuraEnabled public List<String> features;
        @AuraEnabled public Decimal monthlyPrice;
        @AuraEnabled public Decimal annualPrice;
        @AuraEnabled public Integer minEmployees;
        @AuraEnabled public List<String> tags;
    }

    public class ProductRecommendation implements Comparable {
        @AuraEnabled public UKGProduct product;
        @AuraEnabled public Integer matchScore;
        @AuraEnabled public String matchLabel;

        public Integer compareTo(Object other) {
            ProductRecommendation otherRec = (ProductRecommendation) other;
            return otherRec.matchScore - this.matchScore;
        }
    }
}
