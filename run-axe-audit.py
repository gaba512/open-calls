import sys, io, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from selenium import webdriver
from selenium.webdriver.edge.options import Options

# Load axe-core JS
with open(r'C:\Users\hazel\Documents\Claude\tools\node\node_modules\axe-core\axe.min.js', 'r', encoding='utf-8') as f:
    axe_js = f.read()

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--window-size=1400,900')

driver = webdriver.Edge(options=opts)

PAGES = [
    ('Dashboard', 'http://localhost:8787/index.html#/dashboard'),
    ('Open Calls', 'http://localhost:8787/index.html#/inbox'),
    ('Artists', 'http://localhost:8787/index.html#/artists'),
    ('Analytics', 'http://localhost:8787/index.html#/analytics')
]

try:
    for page_name, url in PAGES:
        print(f"\n=======================================================")
        print(f"  Auditing {page_name}: {url}")
        print(f"=======================================================")
        driver.get(url)
        time.sleep(3)
        
        # Inject axe-core
        driver.execute_script(axe_js)
        
        # Run axe analysis
        raw_results = driver.execute_async_script("""
            var done = arguments[arguments.length - 1];
            axe.run({
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                }
            }).then(done);
        """)
        
        violations = raw_results.get('violations', [])
        passes = raw_results.get('passes', [])
        incomplete = raw_results.get('incomplete', [])
        
        print(f"Rules Passed: {len(passes)} | Incomplete: {len(incomplete)} | Violations: {len(violations)}")
        
        if not violations:
            print("  🎉 PERFECT: No WCAG AA violations found!")
        else:
            for i, v in enumerate(violations, 1):
                print(f"\n  [{i}] {v['id']} ({v['impact'].upper()} impact): {v['description']}")
                print(f"      Help: {v['helpUrl']}")
                nodes = v.get('nodes', [])
                for n in nodes[:3]: # show up to first 3 instances
                    target = ', '.join(n.get('target', []))
                    print(f"      - Target: {target}")
                    print(f"        Summary: {n.get('failureSummary', '').replace(chr(10), ' ')[:140]}")
                if len(nodes) > 3:
                    print(f"      ... and {len(nodes) - 3} more elements")

finally:
    driver.quit()
