"""Optional UI regression checks. Start the site, then run this script."""
import argparse
import os
import shutil
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:3000')
args = parser.parse_args()

with sync_playwright() as playwright:
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser = playwright.chromium.launch(headless=True, executable_path=executable)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    response = page.goto(args.url, wait_until='networkidle')
    assert response.status == 200
    page.evaluate('document.fonts.ready')
    assert page.locator('h1').inner_text().lower() == 'быть\nдома'
    assert page.locator('[data-project]').count() == 3
    for image in page.locator('main img').all():
        image.scroll_into_view_if_needed()
        image.evaluate('(el) => el.decode()')
    assert page.evaluate('Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)')

    # Filters also update their accessible state and announcement.
    page.locator('.filter-panel > summary').click()
    for category, project in [('apartment', '0'), ('house', '1'), ('residence', '2')]:
        button = page.locator(f'[data-filter="{category}"]')
        button.click()
        assert button.get_attribute('aria-pressed') == 'true'
        assert page.locator('[data-project]:visible').count() == 1
        assert page.locator(f'[data-project="{project}"]').is_visible()
        assert page.locator('#project-count').inner_text() == 'Показано проектов: 1.'
    page.locator('[data-filter="all"]').click()
    assert page.locator('[data-project]:visible').count() == 3

    for index, title in [('0', 'Тёплый свет'), ('1', 'Тихое утро'), ('2', 'Линия покоя')]:
        card = page.locator(f'[data-project="{index}"]')
        card.click()
        assert page.locator('#project-dialog').evaluate('(el) => el.open')
        assert page.locator('#project-modal-title').inner_text() == title
        page.keyboard.press('Escape')
        assert card.evaluate('(el) => el === document.activeElement')

    page.locator('[data-studio]').click()
    assert page.locator('#studio-dialog').evaluate('(el) => el.open')
    # Use the keyboard for accordion controls.
    summary = page.locator('.steps details').nth(1).locator('summary')
    summary.focus()
    page.keyboard.press('Enter')
    assert summary.locator('..').evaluate('(el) => el.open')
    page.locator('.faq-list summary').first.click()
    assert page.locator('.faq-list details').first.evaluate('(el) => el.open')

    page.keyboard.press('Escape')
    assert page.locator('[data-studio]').evaluate('(el) => el === document.activeElement')
    page.locator('.nav-contact').click()
    form = page.locator('#brief-form')
    form.locator('button[type="submit"]').click()
    assert not form.evaluate('(el) => el.checkValidity()')
    page.locator('input[name="name"]').fill('   ')
    page.locator('input[name="area"]').fill('86')
    form.locator('button[type="submit"]').click()
    assert not page.locator('input[name="name"]').evaluate('(el) => el.checkValidity()')
    page.locator('input[name="name"]').fill('Анна')
    page.locator('textarea').fill('Много света и большой стол')
    with page.expect_download() as info:
        form.locator('button[type="submit"]').click()
    with tempfile.TemporaryDirectory() as folder:
        file = Path(folder) / info.value.suggested_filename
        info.value.save_as(file)
        text = file.read_text('utf-8-sig')
        assert 'Анна' in text and '86 м²' in text and 'большой стол' in text
    assert 'Бриф готов' in page.locator('#form-status').inner_text()
    page.locator('textarea').fill('Новая идея')
    assert page.locator('#form-status').inner_text() == ''
    page.keyboard.press('Escape')

    page.locator('#privacy-button').click()
    assert page.locator('#privacy-dialog').evaluate('(el) => el.open')
    page.keyboard.press('Escape')

    for width in [320, 390, 768, 1024, 1440, 1920]:
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        # Readable content stays on-screen; the title may overlap the photograph.
        for selector in ['h1', '.hero-description', '.hero-cta', '.studio-copy']:
            rect = page.locator(selector).bounding_box()
            assert rect['x'] >= 0 and rect['x'] + rect['width'] <= width, (width, selector)

    page.set_viewport_size({'width': 390, 'height': 844})
    gallery = page.locator('.projects-grid')
    assert gallery.evaluate('(el) => el.scrollWidth > el.clientWidth')
    gallery.evaluate('(el) => { el.scrollLeft = el.scrollWidth; }')
    page.locator('[data-project="2"]').click()
    assert page.locator('#project-modal-title').inner_text() == 'Линия покоя'
    page.keyboard.press('Escape')
    page.locator('.menu-toggle').click()
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'true'
    page.locator('.navigation a[href="#projects"]').click()
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    page.locator('.menu-toggle').click()
    page.keyboard.press('Escape')
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    page.locator('.menu-toggle').click()
    page.locator('.nav-contact').click()
    assert page.locator('#brief-dialog').evaluate('(el) => el.open')
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    page.keyboard.press('Escape')
    expect(page.locator('.menu-toggle')).to_be_focused()
    page.emulate_media(reduced_motion='reduce')
    assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior') == 'auto'
    assert not errors, errors
    browser.close()
    print('Passed: responsive layout, filters, touch gallery, studio/project dialogs, accordions, form validation, brief download, menu and reduced motion; no JS errors.')
