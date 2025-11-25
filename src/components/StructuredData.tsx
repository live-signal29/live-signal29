// Structured Data (JSON-LD) generators for SEO

export const getWebsiteStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "TREND IS FRIEND",
  "description": "Professional trading signals platform for Forex, Crypto, Commodities, and Indices",
  "url": "https://yourdomain.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://yourdomain.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
});

export const getOrganizationStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "TREND IS FRIEND",
  "description": "Leading provider of real-time trading signals",
  "url": "https://yourdomain.com",
  "logo": "https://yourdomain.com/og-image.jpg",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "url": "https://yourdomain.com/contact"
  },
  "sameAs": [
    "https://twitter.com/trendisfriend",
    "https://facebook.com/trendisfriend",
    "https://instagram.com/trendisfriend"
  ]
});

export const getProductStructuredData = (planName: string, price: number, currency: string = "USD") => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": `${planName} Trading Signals Plan`,
  "description": `${planName} subscription plan for live trading signals`,
  "brand": {
    "@type": "Brand",
    "name": "TREND IS FRIEND"
  },
  "offers": {
    "@type": "Offer",
    "price": price,
    "priceCurrency": currency,
    "availability": "https://schema.org/InStock",
    "url": "https://yourdomain.com/premium"
  }
});

export const getArticleStructuredData = (
  title: string,
  description: string,
  imageUrl: string,
  publishedDate: string,
  modifiedDate?: string
) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": title,
  "description": description,
  "image": imageUrl,
  "datePublished": publishedDate,
  "dateModified": modifiedDate || publishedDate,
  "author": {
    "@type": "Organization",
    "name": "TREND IS FRIEND"
  },
  "publisher": {
    "@type": "Organization",
    "name": "TREND IS FRIEND",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yourdomain.com/og-image.jpg"
    }
  }
});

export const getTradingSignalStructuredData = (
  signalType: string,
  pair: string,
  entry: string,
  tp: string,
  sl: string,
  publishedDate: string
) => ({
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  "name": `${signalType} Signal - ${pair}`,
  "description": `Live ${signalType} trading signal for ${pair}. Entry: ${entry}, TP: ${tp}, SL: ${sl}`,
  "category": "Trading Signal",
  "provider": {
    "@type": "Organization",
    "name": "TREND IS FRIEND"
  },
  "datePublished": publishedDate
});

export const getBreadcrumbStructuredData = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const getFAQStructuredData = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});
