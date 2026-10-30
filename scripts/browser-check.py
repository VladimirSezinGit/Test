"""Optional UI regression checks. Start the site, then run this script."""
import argparse
import os
import shutil
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

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
    assert page.locator('h1').inner_text() == 'Быть\nдома.'
    for image in page.locator('main img').all():
        image.scroll_into_view_if_needed()
        image.evaluate('(el) => el.decode()')
    assert page.evaluate('Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)')

    # Filters also update their accessible state and announcement.
    for category, project in [('apartment', '0'), ('residence', '1')]:
        button = page.locator(f'[data-filter="{category}"]')
        button.click()
        assert button.get_attribute('aria-pressed') == 'true'
        assert page.locator('[data-project]:visible').count() == 1
        assert page.locator(f'[data-project="{project}"]').is_visible()
        assert page.locator('#project-count').inner_text() == '01 пространство'
    page.locator('[data-filter="all"]').click()
    assert page.locator('[data-project]:visible').count() == 2

    for index, title in [('0', 'Тёплый свет'), ('1', 'Тихое утро')]:
        card = page.locator(f'[data-project="{index}"]')
        card.click()
        assert page.locator('#project-dialog').evaluate('(el) => el.open')
        assert page.locator('#project-modal-title').inner_text() == title
        page.keyboard.press('Escape')
        assert card.evaluate('(el) => el === document.activeElement')

    # Use the keyboard for accordion controls.
    summary = page.locator('.steps details').nth(1).locator('summary')
    summary.focus()
    page.keyboard.press('Enter')
    assert summary.locator('..').evaluate('(el) => el.open')
    page.locator('.faq-list summary').first.click()
    assert page.locator('.faq-list details').first.evaluate('(el) => el.open')

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
        # The desktop hero description must not collide with its CTA.
        if width >= 768:
            copy = page.locator('.hero-copy').bounding_box()
            cta = page.locator('.hero-cta').bounding_box()
            assert copy['x'] + copy['width'] + 16 <= cta['x'], width

    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.menu-toggle').click()
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'true'
    page.locator('.navigation a[href="#projects"]').click()
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    page.locator('.menu-toggle').click()
    page.keyboard.press('Escape')
    assert page.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    page.emulate_media(reduced_motion='reduce')
    assert page.evaluate('getComputedStyle(document.documentElement).scrollBehavior') == 'auto'
    assert not errors, errors
    browser.close()
    print('Passed: responsive layout, filters, dialogs, accordions, form validation, brief download, menu and reduced motion; no JS errors.')
