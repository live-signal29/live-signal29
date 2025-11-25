import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  structuredData?: object;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const SEO = ({
  title = "TREND IS FRIEND - Live Trading Signals | Forex, Crypto, Commodities & Indices",
  description = "Get real-time trading signals for Forex, Crypto, Commodities, and Indices. Professional analysis, high accuracy, instant notifications. Start your 8-day free trial today!",
  keywords = "trading signals, forex signals, crypto signals, commodities trading, indices signals, live trading, buy sell signals, trading analysis, technical analysis, trading alerts",
  image = "/og-share-preview.jpg",
  url = "https://yourdomain.com",
  type = "website",
  structuredData,
  author = "TREND IS FRIEND",
  publishedTime,
  modifiedTime,
}: SEOProps) => {
  const fullTitle = title.includes("TREND IS FRIEND") ? title : `${title} | TREND IS FRIEND`;
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <link rel="canonical" href={url} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1920" />
      <meta property="og:image:height" content="1008" />
      <meta property="og:site_name" content="TREND IS FRIEND" />
      <meta property="og:locale" content="en_US" />
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@trendisfriend" />
      <meta name="twitter:site" content="@trendisfriend" />
      
      {/* Mobile Web App */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="TREND IS FRIEND" />
      
      {/* Theme Color */}
      <meta name="theme-color" content="#0EA5E9" />
      <meta name="msapplication-TileColor" content="#0EA5E9" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
