import yaml
import jinja2
import os
import subprocess


# Function to make YAML strings LaTeX-safe
def tex_escape(text):
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    chars = {
        '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#',
        '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
    }
    return "".join(chars.get(c, c) for c in text)


# Set up Jinja2
# Look in the 'templates' folder for your .j2 files
env = jinja2.Environment(
    block_start_string='((%',
    block_end_string='%))',
    variable_start_string='(((',
    variable_end_string=')))',
    loader=jinja2.FileSystemLoader('templates')
)
env.filters['tex_escape'] = tex_escape


def build():
    # 1. Define which YAML maps to which Template
    # This is the "sections" part you were looking for!
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

    # 2. Generate the individual .tex files in the /cv folder
    os.makedirs('cv', exist_ok=True)

    for yaml_key, template_file in sections.items():
        yaml_path = f'_data/{yaml_key}.yml'

        if os.path.exists(yaml_path):
            with open(yaml_path, 'r', encoding='utf-8') as stream:
                data = yaml.safe_load(stream)

            template = env.get_template(template_file)
            rendered = template.render(data=data)

            output_tex = f'cv/{yaml_key}.tex'
            with open(output_tex, 'w', encoding='utf-8') as f:
                f.write(rendered)
            print(f"Generated {output_tex}")
        else:
            print(f"Skipping {yaml_key}: YAML not found at {yaml_path}")

    # 3. Compile your ACTUAL main.tex
    # (Assuming main.tex is in your root folder)
    if os.path.exists('main.tex'):
        print("Compiling main.tex...")
        subprocess.run(["lualatex", "-interaction=nonstopmode", "main.tex"], check=True)

        # 4. Move the result to assets
        os.makedirs('assets/pdf', exist_ok=True)
        if os.path.exists('main.pdf'):
            os.replace('main.pdf', 'assets/pdf/stijn_denissen_cv.pdf')
            print("CV successfully updated in assets/pdf/")
    else:
        print("Error: main.tex not found in root directory.")


if __name__ == "__main__":
    build()