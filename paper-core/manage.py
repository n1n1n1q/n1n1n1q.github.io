import os
import sys
import json
import shutil
import re
from datetime import datetime

# Set console encoding to UTF-8 to handle Cyrillic paths on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Paths (relative to the location of this script inside paper-core/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
PAPERS_DIR = os.path.join(BASE_DIR, 'papers')
TEMPLATE_DIR = SCRIPT_DIR
PUBLICATIONS_FILE = os.path.join(BASE_DIR, 'publications.html')

def create_new_paper(slug):
    # Validate slug
    if not re.match(r'^[a-zA-Z0-9_-]+$', slug):
        print(f"Error: Invalid slug '{slug}'. Use only letters, numbers, hyphens, and underscores.")
        sys.exit(1)
        
    paper_dir = os.path.join(PAPERS_DIR, slug)
    if os.path.exists(paper_dir):
        print(f"Error: Paper directory '{paper_dir}' already exists.")
        sys.exit(1)
        
    # Create directories
    os.makedirs(os.path.join(paper_dir, 'assets'), exist_ok=True)
    
    # Copy template HTML and metadata
    src_html = os.path.join(TEMPLATE_DIR, 'template.html')
    dest_html = os.path.join(paper_dir, 'index.html')
    
    src_meta = os.path.join(TEMPLATE_DIR, 'template_metadata.json')
    dest_meta = os.path.join(paper_dir, 'metadata.json')
    
    if os.path.exists(src_html) and os.path.exists(src_meta):
        shutil.copy(src_html, dest_html)
        
        # Edit the Title in the index.html placeholder to match the slug
        with open(dest_html, 'r', encoding='utf-8') as f:
            content = f.read()
        
        title_val = slug.replace('-', ' ').replace('_', ' ').title()
        content = content.replace("Your Awesome Research Paper Title Goes Here", title_val)
        with open(dest_html, 'w', encoding='utf-8') as f:
            f.write(content)
            
        shutil.copy(src_meta, dest_meta)
        
        # Update metadata title inside the cloned file
        with open(dest_meta, 'r', encoding='utf-8') as f:
            meta = json.load(f)
        meta['title'] = title_val
        meta['date'] = datetime.today().strftime('%Y-%m-%d')
        meta['year'] = datetime.today().year
        # Remove custom link placeholder url or keep empty
        if meta.get('custom_links') and len(meta['custom_links']) > 0:
            meta['custom_links'][0]['url'] = f"./papers/{slug}/"
            
        with open(dest_meta, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2)
            
        print(f"Success! Created new paper at: {paper_dir}")
        print("Next steps:")
        print(f"  1. Add your paper assets inside: {os.path.join(paper_dir, 'assets')}")
        print(f"  2. Edit paper content inside: {dest_html}")
        print(f"  3. Configure search snippet & links inside: {dest_meta}")
        print("  4. Rebuild the publications page using: python paper-core/manage.py build")
    else:
        print("Error: Template files not found in paper-core/.")
        sys.exit(1)

def build_publications():
    if not os.path.exists(PAPERS_DIR):
        print(f"No papers directory found at {PAPERS_DIR}. Creating one...")
        os.makedirs(PAPERS_DIR, exist_ok=True)
        
    papers = []
    
    # Scan all directories in papers/
    for entry in os.listdir(PAPERS_DIR):
        entry_path = os.path.join(PAPERS_DIR, entry)
        if os.path.isdir(entry_path):
            meta_path = os.path.join(entry_path, 'metadata.json')
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                    # Store path slug to compute default links
                    meta['slug'] = entry
                    papers.append(meta)
                except Exception as e:
                    print(f"Warning: Failed to parse {meta_path}. Error: {e}")
                    
    # Sort papers by date (descending)
    def get_sort_key(p):
        date_str = p.get('date', '')
        if date_str:
            try:
                return datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                pass
        year = p.get('year', 0)
        # fallback date using year
        try:
            return datetime(int(year), 12, 31)
        except (ValueError, TypeError):
            return datetime(1970, 1, 1)

    papers.sort(key=get_sort_key, reverse=True)
    
    # Generate HTML snippet
    html_snippets = []
    if not papers:
        html_snippets.append('      <p class="page-empty">Nothing published yet :(</p>')
    else:
        for p in papers:
            title = p.get('title', 'Untitled')
            slug = p.get('slug')
            # Project page link defaults to the directory containing it
            proj_url = f"./papers/{slug}/"
            
            # Format authors list
            authors = p.get('authors', 'Oleh Basystyi')
            
            # Conference name
            conference = p.get('conference', '')
            year = p.get('year', '')
            period_str = f"{conference}"
            if year and str(year) not in conference:
                period_str += f" &middot; {year}" if conference else f"{year}"
                
            abstract = p.get('abstract_snippet', '')
            
            # Build links block
            links = []
            
            # Default custom link (Project Page)
            links.append(f'<a href="{proj_url}">[Project Page]</a>')
            
            # PDF Link
            if p.get('pdf_url'):
                links.append(f'<a href="{p["pdf_url"]}" target="_blank" rel="noopener">[PDF]</a>')
                
            # arXiv Link
            if p.get('arxiv_url'):
                links.append(f'<a href="{p["arxiv_url"]}" target="_blank" rel="noopener">[arXiv]</a>')
                
            # Code Link
            if p.get('code_url'):
                links.append(f'<a href="{p["code_url"]}" target="_blank" rel="noopener">[Code]</a>')
                
            # Video Link
            if p.get('video_url'):
                links.append(f'<a href="{p["video_url"]}" target="_blank" rel="noopener">[Video]</a>')
                
            # Other custom links
            custom = p.get('custom_links', [])
            for cl in custom:
                name = cl.get('name')
                url = cl.get('url')
                # Skip duplicate project page links since we add it by default
                if name and url and name.lower() != 'project page':
                    links.append(f'<a href="{url}" target="_blank" rel="noopener">[{name}]</a>')
                    
            links_html = '          ' + '\n          '.join(links)
            
            # Build card layout (using entry system consistent with projects.html)
            snippet = f"""      <div class="entry">
        <div class="entry-head">
          <div class="entry-title"><a href="{proj_url}">{title}</a></div>
          <div class="entry-period">{period_str}</div>
        </div>
        <div class="entry-meta">{authors}</div>
        <p class="entry-desc">{abstract}</p>
        <div class="entry-links" style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.8rem; font-size: 13.5px;">
{links_html}
        </div>
      </div>"""
            html_snippets.append(snippet)
            
    publications_content = '\n\n'.join(html_snippets)
    
    # Read publications.html
    if not os.path.exists(PUBLICATIONS_FILE):
        print(f"Error: {PUBLICATIONS_FILE} not found.")
        sys.exit(1)
        
    with open(PUBLICATIONS_FILE, 'r', encoding='utf-8') as f:
        file_content = f.read()
        
    # Replace content between comments
    start_tag = '<!-- PUBLICATIONS_START -->'
    end_tag = '<!-- PUBLICATIONS_END -->'
    
    pattern = re.compile(rf'{start_tag}.*?{end_tag}', re.DOTALL)
    if not pattern.search(file_content):
        print(f"Error: Could not find placeholders {start_tag} and {end_tag} inside {PUBLICATIONS_FILE}.")
        sys.exit(1)
        
    new_content = pattern.sub(f"{start_tag}\n{publications_content}\n      {end_tag}", file_content)
    
    with open(PUBLICATIONS_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"Success! Rebuilt publications page. Processed {len(papers)} publications.")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python paper-core/manage.py new <slug>")
        print("  python paper-core/manage.py build")
        sys.exit(1)
        
    cmd = sys.argv[1].lower()
    if cmd == 'new':
        if len(sys.argv) < 3:
            print("Error: Please provide a paper slug (e.g. 'awesome-paper').")
            sys.exit(1)
        create_new_paper(sys.argv[2])
    elif cmd == 'build':
        build_publications()
    else:
        print(f"Unknown command: '{cmd}'. Use 'new' or 'build'.")
        sys.exit(1)

if __name__ == '__main__':
    main()
