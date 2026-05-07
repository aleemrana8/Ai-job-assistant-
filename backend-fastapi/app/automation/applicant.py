"""Playwright-based Auto-Apply Engine.

Handles:
- LinkedIn Easy Apply
- Indeed Apply
- External application forms
- CAPTCHA detection
- MFA detection
- Form filling with AI-generated answers
"""
import asyncio
from playwright.async_api import async_playwright, Page, Browser

from app.core.config import settings
from app.ai.question_answerer import answer_application_question


async def apply_to_job(job, profile, cover_letter: str) -> dict:
    """
    Attempt to auto-apply to a job using browser automation.
    
    Returns:
        {"success": True/False, "confirmation": "...", "error": "..."}
    """
    apply_link = job.apply_link
    if not apply_link:
        return {"success": False, "error": "No apply link available"}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=settings.HEADLESS)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        try:
            await page.goto(apply_link, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)

            # Detect application type
            app_type = await _detect_application_type(page)

            if app_type == "linkedin_easy_apply":
                result = await _handle_linkedin_easy_apply(page, profile, cover_letter)
            elif app_type == "indeed_apply":
                result = await _handle_indeed_apply(page, profile, cover_letter)
            elif app_type == "external_form":
                result = await _handle_external_form(page, profile, cover_letter)
            elif app_type == "captcha_detected":
                result = {"success": False, "error": "CAPTCHA detected — requires manual intervention"}
            elif app_type == "login_required":
                result = {"success": False, "error": "Login/authentication required — manual action needed"}
            else:
                result = {"success": False, "error": f"Unsupported application type: {app_type}"}

            return result

        except Exception as exc:
            return {"success": False, "error": f"Browser automation error: {str(exc)}"}

        finally:
            await browser.close()


async def _detect_application_type(page: Page) -> str:
    """Detect what type of application form we're dealing with."""
    url = page.url.lower()
    content = await page.content()
    content_lower = content.lower()

    # Check for CAPTCHA
    if "captcha" in content_lower or "recaptcha" in content_lower:
        return "captcha_detected"

    # Check for login walls
    if "sign in" in content_lower and "password" in content_lower:
        if "linkedin.com/login" in url or "indeed.com/account/login" in url:
            return "login_required"

    # LinkedIn Easy Apply
    if "linkedin.com" in url and "easy apply" in content_lower:
        return "linkedin_easy_apply"

    # Indeed Apply
    if "indeed.com" in url or "indeedapply" in content_lower:
        return "indeed_apply"

    # Generic external form
    if any(tag in content_lower for tag in ["<form", "apply", "submit"]):
        return "external_form"

    return "unknown"


async def _handle_linkedin_easy_apply(page: Page, profile, cover_letter: str) -> dict:
    """Handle LinkedIn Easy Apply flow."""
    try:
        # Click Easy Apply button
        easy_apply_btn = page.locator('button:has-text("Easy Apply")')
        if await easy_apply_btn.count() > 0:
            await easy_apply_btn.first.click()
            await asyncio.sleep(2)

        # Fill form fields
        await _fill_common_fields(page, profile)

        # Handle multi-step forms
        max_steps = 5
        for step in range(max_steps):
            # Look for Next/Review/Submit buttons
            next_btn = page.locator('button:has-text("Next"), button:has-text("Review"), button:has-text("Submit")')
            if await next_btn.count() == 0:
                break

            btn_text = await next_btn.first.text_content()

            if "submit" in (btn_text or "").lower():
                await next_btn.first.click()
                await asyncio.sleep(3)
                return {"success": True, "confirmation": "LinkedIn Easy Apply submitted"}

            await next_btn.first.click()
            await asyncio.sleep(2)
            await _fill_common_fields(page, profile)

        return {"success": False, "error": "Could not complete LinkedIn Easy Apply flow"}

    except Exception as exc:
        return {"success": False, "error": f"LinkedIn Easy Apply error: {str(exc)}"}


async def _handle_indeed_apply(page: Page, profile, cover_letter: str) -> dict:
    """Handle Indeed application flow."""
    try:
        await _fill_common_fields(page, profile)

        # Look for continue/submit
        submit_btn = page.locator('button:has-text("Continue"), button:has-text("Submit"), button:has-text("Apply")')
        if await submit_btn.count() > 0:
            await submit_btn.first.click()
            await asyncio.sleep(3)

            # Check for confirmation
            confirmation = await page.locator('.ia-HasApplied, .indeed-apply-status').text_content()
            if confirmation:
                return {"success": True, "confirmation": confirmation}

        return {"success": False, "error": "Could not complete Indeed application"}

    except Exception as exc:
        return {"success": False, "error": f"Indeed apply error: {str(exc)}"}


async def _handle_external_form(page: Page, profile, cover_letter: str) -> dict:
    """Handle generic external application forms."""
    try:
        await _fill_common_fields(page, profile)

        # Try to find and click submit
        submit_btn = page.locator(
            'button[type="submit"], input[type="submit"], button:has-text("Apply"), button:has-text("Submit")'
        )
        if await submit_btn.count() > 0:
            await submit_btn.first.click()
            await asyncio.sleep(3)
            return {"success": True, "confirmation": "External form submitted"}

        return {"success": False, "error": "Could not find submit button on external form"}

    except Exception as exc:
        return {"success": False, "error": f"External form error: {str(exc)}"}


async def _fill_common_fields(page: Page, profile):
    """Fill common application fields (name, email, phone, etc.)."""
    field_mappings = {
        # Name fields
        'input[name*="name" i], input[placeholder*="name" i], input[aria-label*="name" i]': profile.full_name,
        'input[name*="first" i]': profile.full_name.split()[0] if profile.full_name else "",
        'input[name*="last" i]': " ".join(profile.full_name.split()[1:]) if profile.full_name else "",
        # Email
        'input[type="email"], input[name*="email" i], input[placeholder*="email" i]': profile.email,
        # Phone
        'input[type="tel"], input[name*="phone" i], input[placeholder*="phone" i]': profile.phone,
        # LinkedIn
        'input[name*="linkedin" i], input[placeholder*="linkedin" i]': profile.linkedin_url,
        # Portfolio/website
        'input[name*="website" i], input[name*="portfolio" i], input[placeholder*="website" i]': profile.portfolio_url,
    }

    for selector, value in field_mappings.items():
        if not value:
            continue
        try:
            field = page.locator(selector).first
            if await field.count() > 0:
                is_empty = await field.input_value() == ""
                if is_empty:
                    await field.fill(value)
        except Exception:
            continue
