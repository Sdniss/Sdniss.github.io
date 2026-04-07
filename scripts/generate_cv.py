import yaml
import jinja2
import os
import subprocess
import re


# --- NEW: CJK Wrapper Function ---
def wrap_cjk(text):
    """Wraps Chinese characters in \cjk{} for LaTeX support."""
    if not isinstance(text, str):
        return text
    # Regex finds blocks of Chinese characters (Hanzi)
    return re.sub(r'([\u4e00-\u9fff]+)', r'\\cjk{\1}', text)


# Function to make YAML strings LaTeX-safe
def tex_escape(text):
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    # Important: Apply CJK wrapping BEFORE escaping special LaTeX chars
    # so that the backslash in \cjk doesn't get escaped to \\
    text = wrap_cjk(text)

    chars = {
        '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#',
        '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
    }
    return "".join(chars.get(c, c) for c in text)


# Set up Jinja2
env = jinja2.Environment(
    block_start_string='((%',
    block_end_string='%))',
    variable_start_string='(((',
    variable_end_string=')))',
    loader=jinja2.FileSystemLoader('templates')
)
env.filters['tex_escape'] = tex_escape


def build():
    sections = {
        'conferences': 'conferences.tex.j2',
        'education': 'education.tex.j2',
        'awards_grants': 'awards_grants.tex.j2',
        'languages': 'languages.tex.j2',
        'mentoring': 'mentoring.tex.j2',
        'organisations': 'organisations.tex.j2',
        'professional': 'professional.tex.j2',
        'publications': 'publications.tex.j2',
        'research_stays': 'research_stays.tex.j2',
        'scicomm': 'scicomm.tex.j2',
        'teaching': 'teaching.tex.j2'
    }

    os.makedirs('cv', exist_ok=True)

    for yaml_key, template_file in sections.items():
        yaml_path = f'_data/{yaml_key}.yml'

        if os.path.exists(yaml_path):
            with open(yaml_path, 'r', encoding='utf-8') as stream:
                data = yaml.safe_load(stream)

            # --- NEW: Data Cleaning Logic ---
            if yaml_key == 'education' and 'entries' in data:
                last_year = None
                for entry in data['entries']:
                    # Combine dates for comparison
                    current_range = f"{entry.get('start_date', '')} -- {entry.get('end_date', '')}"
                    if current_range == last_year:
                        entry['display_date'] = ""  # Hide duplicate year
                    else:
                        entry['display_date'] = current_range
                        last_year = current_range

            template = env.get_template(template_file)
            rendered = template.render(data=data)

            output_tex = f'cv/{yaml_key}.tex'
            with open(output_tex, 'w', encoding='utf-8') as f:
                f.write(rendered)
            print(f"Generated {output_tex}")
        else:
            print(f"Skipping {yaml_key}: YAML not found at {yaml_path}")

    # 3. Compile main.tex
    if os.path.exists('main.tex'):
        print("Compiling main.tex...")
        # Note: Added -interaction=nonstopmode to prevent hanging on errors
        subprocess.run(["lualatex", "-interaction=nonstopmode", "main.tex"])
        subprocess.run(["lualatex", "-interaction=nonstopmode", "main.tex"])

        # 4. Move the result to assets
        os.makedirs('assets/pdf', exist_ok=True)
        if os.path.exists('main.pdf'):
            os.replace('main.pdf', 'assets/pdf/stijn_denissen_cv.pdf')
            print("CV successfully updated in assets/pdf/")
        else:
            print("Error: main.pdf was not generated.")
            exit(1)
    else:
        print("Error: main.tex not found.")


if __name__ == "__main__":
    build()