import urllib.request
import urllib.parse
import json
import csv
import xml.etree.ElementTree as ET

def fetch_assets_year_xml(year):
    # DBLP provides XML data directly for specific conference proceedings volumes.
    # The URL pattern for ASSETS is: https://dblp.org/db/conf/assets/assets{year}.xml
    url = f"https://dblp.org/db/conf/assets/assets{year}.xml"
    print(f"Fetching: {url}")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            return response.read()
    except Exception as e:
        print(f"Error fetching year {year}: {e}")
        return None

def parse_xml_to_papers(xml_data, year):
    papers = []
    if not xml_data:
        return papers
        
    try:
        root = ET.fromstring(xml_data)
        # In DBLP XML, publications are typically under <inproceedings> or <proceedings> tags
        for pub in root.findall('.//inproceedings'):
            title_elem = pub.find('title')
            title = "".join(title_elem.itertext()).strip() if title_elem is not None else ""
            if title.endswith('.'):
                title = title[:-1]
                
            authors = []
            for author in pub.findall('author'):
                authors.append(author.text)
            
            pages_elem = pub.find('pages')
            pages = pages_elem.text if pages_elem is not None else ""
            
            ee_elems = pub.findall('ee')
            ee_list = [ee.text for ee in ee_elems if ee.text]
            ee = ee_list[0] if ee_list else ""
            
            # Find DOI in ee list if possible
            doi = ""
            for item in ee_list:
                if "doi.org" in item:
                    doi = item.split("doi.org/")[-1]
                    break
            
            dblp_key = pub.get('key', '')
            
            papers.append({
                'Title': title,
                'Authors': "; ".join(authors),
                'Year': year,
                'DOI': doi,
                'URL': ee,
                'DBLP Key': dblp_key,
                'Pages': pages,
                'Type': 'inproceedings'
            })
    except Exception as e:
        print(f"Error parsing XML for year {year}: {e}")
        
    return papers

def main():
    all_papers = []
    # Collect papers for 2023, 2024, 2025, 2026
    for year in range(2023, 2027):
        xml_content = fetch_assets_year_xml(year)
        if xml_content:
            papers = parse_xml_to_papers(xml_content, year)
            print(f"Found {len(papers)} papers for year {year}")
            all_papers.extend(papers)
            
    csv_file = "assets_papers_2023_2026.csv"
    fields = ['Title', 'Authors', 'Year', 'DOI', 'URL', 'DBLP Key', 'Pages', 'Type']
    
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(all_papers)
        
    print(f"Successfully saved {len(all_papers)} papers to {csv_file}")

if __name__ == "__main__":
    main()
