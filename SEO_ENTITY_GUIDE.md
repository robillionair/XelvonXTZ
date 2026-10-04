# Robin-Kevin Vettik — Personal Knowledge Graph & Entity Disambiguation Playbook

This document serves as the operational SEO guide and Knowledge Graph execution roadmap for **Robin-Kevin Vettik** and **Robillionair OÜ**.

---

## 1. Executive Summary & Current Status

### What Is Working Much Better Now

* **High Domain-Authority (DA) External Citations:**  
  Personal websites often struggle to rank on page 1 alone if they lack domain age and backlink volume.  
  By associating your exact name with **GitHub (DA 96)**, **Hugging Face (DA 88)**, **Dev.to (DA 80)**, and **Substack (DA 92)**, Google’s crawlers encounter high-trust third-party domains explicitly attributing code, models, and articles to **Robin-Kevin Vettik**.
* **Entity Disambiguation:**  
  `"Robin-Kevin Vettik"` is an uncommon, distinct name. Because you tied it to unique keywords (**DrosophiLLM**, **Robillionair OÜ**, **FlyWire Connectome**), there is virtually zero keyword collision or competitor ambiguity.
* **Cleaned Crawl Pipeline:**  
  The updated `sitemap.xml` with canonical URLs, valid XML headers, and `<lastmod>` tags prevents Googlebot from getting stuck on redirects or skipping stale pages.

---

## 2. The 4-Step Knowledge Graph Action Checklist

### Step 1: Add Person Schema (JSON-LD) to Your Website (Critical — Status: Implemented)

Google doesn't just read plain text; it reads entity graphs. Explicitly defining that the person **Robin-Kevin Vettik** owns `robillionair.com` and engineered DrosophiLLM allows search crawlers to establish a verified entity node.

#### Canonical JSON-LD Markup
This script is placed in the `<head>` of both `https://robillionair.com/` (`index.html`) and `https://robillionair.com/about` (`about.html`):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Robin-Kevin Vettik",
  "url": "https://robillionair.com",
  "jobTitle": "Founder & Systems Engineer",
  "worksFor": {
    "@type": "Organization",
    "name": "Robillionair OÜ",
    "url": "https://robillionair.com"
  },
  "sameAs": [
    "https://github.com/Rob-bio4",
    "https://huggingface.co/Robillionair",
    "https://substack.com/@robillionair"
  ],
  "knowsAbout": [
    "Neuromorphic Computing",
    "Large Language Models",
    "Sparse Connectomics",
    "PyTorch",
    "Systems Architecture"
  ]
}
</script>
```

#### Why This Matters
The `"sameAs"` array acts as a cryptographic mesh for Googlebot. It links your personal domain directly to your GitHub, Hugging Face, and social profiles, which triggers Google to assemble a unified Knowledge Graph box on the right side of search results.

---

### Step 2: Synchronize Your Cross-Platform Backlinks

Ensure the link loop is closed symmetrically across every external platform. Update profiles to match the following specifications:

| Platform | Handle / Field | Target Configuration |
| :--- | :--- | :--- |
| **GitHub** | `@Rob-bio4` | **Display Name:** `Robin-Kevin Vettik`<br>**Bio:** `Founder @ Robillionair OÜ · Creator of DrosophiLLM`<br>**Website:** `https://robillionair.com` |
| **Hugging Face** | `@Robillionair` | **Full Name:** `Robin-Kevin Vettik`<br>**Homepage URL:** `https://robillionair.com` |
| **Substack** | `@robillionair` | **Byline:** `Robin-Kevin Vettik, Founder at Robillionair OÜ`<br>**Link:** `https://robillionair.com` |
| **Dev.to** | `@robillionair` | **Byline:** `Robin-Kevin Vettik, Founder at Robillionair OÜ`<br>**Link:** `https://robillionair.com` |

> **Key Rule:** When all high-authority platforms point back to `robillionair.com` using the exact string **"Robin-Kevin Vettik"**, Google treats `robillionair.com` as the canonical authority for that entity.

---

### Step 3: Force Re-Indexing in Google Search Console (GSC)

Googlebot will eventually discover the changes on its own, but crawl cycles can take 1 to 3 weeks. To accelerate indexing within 24 to 48 hours:

1. Navigate to [Google Search Console](https://search.google.com/search-console).
2. Select the `robillionair.com` property.
3. In the left navigation, click **Sitemaps** and resubmit:
   ```text
   https://robillionair.com/sitemap.xml
   ```
4. Enter the primary URLs in the top **URL Inspection** search bar:
   * `https://robillionair.com/`
   * `https://robillionair.com/about`
5. Click **"Request Indexing"** on each inspected URL.

---

### Step 4: The Exact Spelling Rule (Hyphenation Consistency)

Ensure consistent orthography across every code comment, metadata tag, schema node, and public bio:

* **Target string:** `Robin-Kevin Vettik`
* **Rule:** Never drop the hyphen (avoid *Robin Kevin Vettik*) or use initials (*R. K. Vettik*) on primary profile headers. Consistency allows search engines to aggregate all mentions under a single indexed entity without splitting ranking signals.

---

## 3. Structured Data Validation

You can validate the deployed JSON-LD schema using Google's official testing utilities:
* [Google Rich Results Test](https://search.google.com/test/rich-results)
* [Schema.org Validator](https://validator.schema.org/)
