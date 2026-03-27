public with sharing class UKGProductService {

    // ── Cached metadata ──
    private static Map<String, Scoring_Weight__mdt> cachedWeights;
    private static Map<String, List<Industry_Boost__mdt>> cachedIndustryBoosts;
    private static Map<String, List<Product_Affinity__mdt>> cachedAffinities;

    // ── Public methods ──

    @AuraEnabled(cacheable=true)
    public static List<ProductRecommendation> getRecommendedProducts(
        String industry,
        Integer employeeCount,
        List<String> requirements
    ) {
        Map<String, Scoring_Weight__mdt> weights = loadScoringWeights();
        List<Industry_Boost__mdt> industryBoosts = loadIndustryBoosts(industry);
        List<Product2> allProducts = queryAllProducts();

        // Build product code map for affinity resolution
        Map<String, Product2> codeMap = new Map<String, Product2>();
        Set<String> productCodes = new Set<String>();
        for (Product2 p : allProducts) {
            codeMap.put(p.ProductCode, p);
            productCodes.add(p.ProductCode);
        }

        Map<String, List<Product_Affinity__mdt>> affinityMap = loadProductAffinities(productCodes);

        // Calculate max possible score for normalization
        Integer maxPossible = 0;
        for (Scoring_Weight__mdt w : weights.values()) {
            maxPossible += Integer.valueOf(w.Max_Contribution__c);
        }
        // Add max industry boost contribution
        maxPossible += 24;
        if (maxPossible == 0) maxPossible = 100;

        List<ProductRecommendation> recommendations = new List<ProductRecommendation>();

        for (Product2 prod : allProducts) {
            ScoringResult result = calculateEnhancedScore(
                prod, industry, employeeCount, requirements, weights, industryBoosts
            );

            if (result.rawScore > 0) {
                ProductRecommendation rec = new ProductRecommendation();
                rec.product = prod;
                rec.matchScore = Math.min(100, (result.rawScore * 100) / maxPossible);
                rec.matchLabel = getMatchLabel(rec.matchScore);
                rec.monthlyPrice = prod.Monthly_Price__c != null ? prod.Monthly_Price__c : 0;
                rec.annualPrice = prod.Annual_Price__c != null ? prod.Annual_Price__c : 0;
                rec.featureList = parseFeatures(prod.Features__c);
                rec.reasons = result.reasons;
                rec.affinityProducts = resolveAffinities(prod.ProductCode, affinityMap, codeMap);
                recommendations.add(rec);
            }
        }

        recommendations.sort();
        return recommendations;
    }

    @AuraEnabled(cacheable=true)
    public static List<ProductRecommendation> getAllProducts() {
        List<ProductRecommendation> results = new List<ProductRecommendation>();
        List<Product2> products = queryAllProducts();

        Map<String, Product2> codeMap = new Map<String, Product2>();
        Set<String> productCodes = new Set<String>();
        for (Product2 p : products) {
            codeMap.put(p.ProductCode, p);
            productCodes.add(p.ProductCode);
        }
        Map<String, List<Product_Affinity__mdt>> affinityMap = loadProductAffinities(productCodes);

        for (Product2 prod : products) {
            ProductRecommendation rec = new ProductRecommendation();
            rec.product = prod;
            rec.matchScore = 0;
            rec.matchLabel = '';
            rec.monthlyPrice = prod.Monthly_Price__c != null ? prod.Monthly_Price__c : 0;
            rec.annualPrice = prod.Annual_Price__c != null ? prod.Annual_Price__c : 0;
            rec.featureList = parseFeatures(prod.Features__c);
            rec.reasons = new List<RecommendationReason>();
            rec.affinityProducts = resolveAffinities(prod.ProductCode, affinityMap, codeMap);
            results.add(rec);
        }

        return results;
    }

    @AuraEnabled
    public static Id createLead(
        String firstName, String lastName, String company,
        String email, String phone, String title, String industry,
        Integer employeeCount, String companySize,
        String requirements, String notes
    ) {
        Lead l = new Lead(
            FirstName = firstName,
            LastName = lastName,
            Company = company,
            Email = email,
            Phone = phone,
            Title = title,
            Industry = industry,
            Employee_Count__c = employeeCount,
            Company_Size__c = companySize,
            Requirements__c = requirements,
            Additional_Notes__c = notes
        );
        insert l;
        return l.Id;
    }

    @AuraEnabled(cacheable=true)
    public static Lead getLeadById(Id leadId) {
        return [
            SELECT Id, FirstName, LastName, Company, Email, Phone, Title,
                   Industry, Employee_Count__c, Company_Size__c,
                   Requirements__c, Additional_Notes__c
            FROM Lead
            WHERE Id = :leadId
            LIMIT 1
        ];
    }

    @AuraEnabled
    public static Map<String, Object> generateQuote(
        Id leadId,
        List<Id> productIds,
        String billingFrequency
    ) {
        Lead lead = getLeadById(leadId);
        Integer employeeCount = lead.Employee_Count__c != null
            ? Integer.valueOf(lead.Employee_Count__c)
            : 1000;

        List<Product2> products = [
            SELECT Id, Name, ProductCode, Description,
                   Category__c, Tier__c, Monthly_Price__c, Annual_Price__c
            FROM Product2
            WHERE Id IN :productIds AND IsActive = true
        ];

        Decimal subtotal = 0;
        List<Map<String, Object>> lineItems = new List<Map<String, Object>>();

        for (Product2 prod : products) {
            Decimal unitPrice = billingFrequency == 'annual'
                ? (prod.Annual_Price__c != null ? prod.Annual_Price__c : 0)
                : (prod.Monthly_Price__c != null ? prod.Monthly_Price__c : 0);

            Decimal lineTotal = unitPrice * employeeCount;
            subtotal += lineTotal;

            Map<String, Object> item = new Map<String, Object>();
            item.put('productId', prod.Id);
            item.put('productName', prod.Name);
            item.put('category', prod.Category__c);
            item.put('tier', prod.Tier__c);
            item.put('unitPrice', unitPrice);
            item.put('quantity', employeeCount);
            item.put('lineTotal', lineTotal);
            lineItems.add(item);
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
        quote.put('companyName', lead.Company);
        quote.put('contactName', lead.FirstName + ' ' + lead.LastName);
        quote.put('contactEmail', lead.Email);
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

    // ── Metadata loaders ──

    private static Map<String, Scoring_Weight__mdt> loadScoringWeights() {
        if (cachedWeights != null) return cachedWeights;
        cachedWeights = new Map<String, Scoring_Weight__mdt>();
        for (Scoring_Weight__mdt w : [
            SELECT DeveloperName, Weight__c, Max_Contribution__c, Category__c, Description__c
            FROM Scoring_Weight__mdt
        ]) {
            cachedWeights.put(w.DeveloperName, w);
        }
        return cachedWeights;
    }

    private static List<Industry_Boost__mdt> loadIndustryBoosts(String industry) {
        if (String.isBlank(industry)) return new List<Industry_Boost__mdt>();
        return [
            SELECT Industry__c, Tag__c, Bonus_Points__c, Reason_Template__c
            FROM Industry_Boost__mdt
            WHERE Industry__c = :industry
        ];
    }

    private static Map<String, List<Product_Affinity__mdt>> loadProductAffinities(Set<String> productCodes) {
        Map<String, List<Product_Affinity__mdt>> result = new Map<String, List<Product_Affinity__mdt>>();
        for (Product_Affinity__mdt pa : [
            SELECT Source_Product_Code__c, Related_Product_Code__c,
                   Affinity_Strength__c, Affinity_Message__c
            FROM Product_Affinity__mdt
            WHERE Source_Product_Code__c IN :productCodes
        ]) {
            if (!result.containsKey(pa.Source_Product_Code__c)) {
                result.put(pa.Source_Product_Code__c, new List<Product_Affinity__mdt>());
            }
            result.get(pa.Source_Product_Code__c).add(pa);
        }
        return result;
    }

    // ── Enhanced scoring ──

    private static ScoringResult calculateEnhancedScore(
        Product2 product, String industry, Integer employeeCount,
        List<String> requirements, Map<String, Scoring_Weight__mdt> weights,
        List<Industry_Boost__mdt> industryBoosts
    ) {
        ScoringResult result = new ScoringResult();
        Integer minEmp = product.Min_Employees__c != null ? Integer.valueOf(product.Min_Employees__c) : 0;

        // 1. Employee size fit
        Decimal sizeFitWeight = getWeight(weights, 'Employee_Size_Fit', 20);
        Decimal partialFitWeight = getWeight(weights, 'Partial_Size_Fit', 8);

        if (employeeCount >= minEmp) {
            result.rawScore += Integer.valueOf(sizeFitWeight);
            result.reasons.add(makeReason(
                'Right-sized for your ' + employeeCount + ' employees',
                'utility:people', 'size'
            ));
        } else if (employeeCount >= minEmp * 0.5) {
            result.rawScore += Integer.valueOf(partialFitWeight);
            result.reasons.add(makeReason(
                'Scalable as your team grows toward ' + minEmp + '+ employees',
                'utility:trending', 'size'
            ));
        }

        // 2. Requirement matching
        List<String> tags = parseTags(product.Tags__c);
        Decimal reqWeight = getWeight(weights, 'Requirement_Match', 15);
        Decimal reqMax = getMaxContribution(weights, 'Requirement_Match', 45);
        Integer reqScore = 0;

        // Map tag IDs to friendly labels
        Map<String, String> tagLabels = new Map<String, String>{
            'payroll' => 'Payroll Processing',
            'hr' => 'Core HR',
            'time-tracking' => 'Time & Attendance',
            'scheduling' => 'Workforce Scheduling',
            'talent' => 'Talent Management',
            'recruiting' => 'Recruiting & Onboarding',
            'analytics' => 'People Analytics',
            'engagement' => 'Employee Engagement',
            'compliance' => 'Compliance Management',
            'financial-wellness' => 'Financial Wellness',
            'communication' => 'Internal Communications',
            'service-delivery' => 'HR Service Delivery'
        };

        if (requirements != null) {
            Set<String> reqSet = new Set<String>(requirements);
            for (String tag : tags) {
                if (reqSet.contains(tag) && reqScore < reqMax) {
                    reqScore += Integer.valueOf(reqWeight);
                    String label = tagLabels.containsKey(tag) ? tagLabels.get(tag) : tag;
                    result.reasons.add(makeReason(
                        'Matches your ' + label + ' requirement',
                        'utility:check', 'requirement'
                    ));
                }
            }
        }
        result.rawScore += Math.min(Integer.valueOf(reqMax), reqScore);

        // 3. Tier alignment
        String tier = product.Tier__c;
        Decimal tierWeight = getWeight(weights, 'Tier_Fit', 10);

        if (tier == 'Enterprise' && employeeCount >= 500) {
            result.rawScore += Integer.valueOf(tierWeight);
            result.reasons.add(makeReason(
                'Enterprise-grade solution for your scale',
                'utility:shield', 'tier'
            ));
        } else if (tier == 'Mid-Market' && employeeCount < 500) {
            result.rawScore += Integer.valueOf(tierWeight);
            result.reasons.add(makeReason(
                'Optimized for mid-market organizations',
                'utility:target', 'tier'
            ));
        } else if (tier == 'Add-On') {
            result.rawScore += Integer.valueOf(tierWeight / 2);
            result.reasons.add(makeReason(
                'Enhances your core platform capabilities',
                'utility:add', 'tier'
            ));
        }

        // 4. Industry-specific boosts (from Custom Metadata)
        for (Industry_Boost__mdt boost : industryBoosts) {
            if (tags.contains(boost.Tag__c)) {
                result.rawScore += Integer.valueOf(boost.Bonus_Points__c);
                if (String.isNotBlank(boost.Reason_Template__c)) {
                    result.reasons.add(makeReason(
                        boost.Reason_Template__c,
                        'utility:trending', 'industry'
                    ));
                }
            }
        }

        return result;
    }

    private static List<AffinityProduct> resolveAffinities(
        String productCode,
        Map<String, List<Product_Affinity__mdt>> affinityMap,
        Map<String, Product2> codeMap
    ) {
        List<AffinityProduct> result = new List<AffinityProduct>();
        List<Product_Affinity__mdt> affinities = affinityMap.get(productCode);
        if (affinities == null) return result;

        for (Product_Affinity__mdt pa : affinities) {
            Product2 related = codeMap.get(pa.Related_Product_Code__c);
            if (related != null) {
                AffinityProduct ap = new AffinityProduct();
                ap.productCode = pa.Related_Product_Code__c;
                ap.productName = related.Name;
                ap.productId = related.Id;
                ap.affinityStrength = pa.Affinity_Strength__c;
                ap.affinityMessage = pa.Affinity_Message__c;
                result.add(ap);
            }
        }
        return result;
    }

    // ── Helpers ──

    private static Decimal getWeight(Map<String, Scoring_Weight__mdt> weights, String name, Decimal fallback) {
        Scoring_Weight__mdt w = weights.get(name);
        return w != null ? w.Weight__c : fallback;
    }

    private static Decimal getMaxContribution(Map<String, Scoring_Weight__mdt> weights, String name, Decimal fallback) {
        Scoring_Weight__mdt w = weights.get(name);
        return w != null ? w.Max_Contribution__c : fallback;
    }

    private static RecommendationReason makeReason(String text, String icon, String category) {
        RecommendationReason r = new RecommendationReason();
        r.text = text;
        r.icon = icon;
        r.category = category;
        return r;
    }

    private static List<Product2> queryAllProducts() {
        return [
            SELECT Id, Name, ProductCode, Description, IsActive,
                   Category__c, Tier__c, Min_Employees__c, Tags__c, Features__c,
                   Monthly_Price__c, Annual_Price__c
            FROM Product2
            WHERE IsActive = true
            ORDER BY Name
        ];
    }

    private static List<String> parseFeatures(String featuresStr) {
        List<String> features = new List<String>();
        if (String.isNotBlank(featuresStr)) {
            for (String f : featuresStr.split(';')) {
                features.add(f.trim());
            }
        }
        return features;
    }

    private static List<String> parseTags(String tagsStr) {
        List<String> tags = new List<String>();
        if (String.isNotBlank(tagsStr)) {
            for (String t : tagsStr.split(',')) {
                tags.add(t.trim());
            }
        }
        return tags;
    }

    private static String getMatchLabel(Integer score) {
        if (score >= 80) return 'Best Match';
        if (score >= 60) return 'Strong Match';
        if (score >= 40) return 'Good Match';
        return 'Possible Match';
    }

    // ── Inner classes ──

    public class RecommendationReason {
        @AuraEnabled public String text;
        @AuraEnabled public String icon;
        @AuraEnabled public String category;
    }

    public class AffinityProduct {
        @AuraEnabled public String productCode;
        @AuraEnabled public String productName;
        @AuraEnabled public Id productId;
        @AuraEnabled public String affinityStrength;
        @AuraEnabled public String affinityMessage;
    }

    private class ScoringResult {
        Integer rawScore = 0;
        List<RecommendationReason> reasons = new List<RecommendationReason>();
    }

    public class ProductRecommendation implements Comparable {
        @AuraEnabled public Product2 product;
        @AuraEnabled public Decimal monthlyPrice;
        @AuraEnabled public Decimal annualPrice;
        @AuraEnabled public List<String> featureList;
        @AuraEnabled public Integer matchScore;
        @AuraEnabled public String matchLabel;
        @AuraEnabled public List<RecommendationReason> reasons;
        @AuraEnabled public List<AffinityProduct> affinityProducts;

        public Integer compareTo(Object other) {
            ProductRecommendation otherRec = (ProductRecommendation) other;
            return otherRec.matchScore - this.matchScore;
        }
    }
}
