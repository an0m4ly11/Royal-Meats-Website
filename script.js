/* Royal Meats — site scripts: mobile menu, scroll animations, forms */

/* ---------- Mobile menu ---------- */
;(function mobileMenu() {
  const toggle = document.querySelector('button[aria-controls="mobile-nav"]')
  const nav = document.getElementById('mobile-nav')
  if (!toggle || !nav) return

  function setOpen(open) {
    nav.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    toggle.querySelector('[data-icon="open"]').toggleAttribute('hidden', open)
    toggle.querySelector('[data-icon="close"]').toggleAttribute('hidden', !open)
  }

  toggle.addEventListener('click', () => setOpen(nav.hidden))
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)))
})()

/* ---------- Scroll reveal animations ---------- */
;(function scrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const main = document.querySelector('main')
  if (!main || !('IntersectionObserver' in window)) return

  const STAGGER_MS = 90
  const MAX_STAGGER_STEPS = 6
  const targets = new Set()

  main.querySelectorAll('section .grid, section ul').forEach((group) => {
    if (group.closest('form')) return
    Array.from(group.children).forEach((child, index) => {
      child.style.setProperty('--reveal-delay', Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS + 'ms')
      targets.add(child)
    })
  })

  main.querySelectorAll('section > div > *, section > *:not(div):not(img)').forEach((el) => {
    const isGroup = el.matches('.grid, ul') || el.querySelector('.grid, ul')
    const insideTarget = Array.from(targets).some((t) => t !== el && t.contains(el))
    if (!isGroup && !insideTarget) targets.add(el)
  })

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  )

  targets.forEach((el) => {
    el.classList.add('reveal')
    observer.observe(el)
  })
})()

/* ---------- Forms ----------
   Submissions are checked in the browser but not sent anywhere yet.
   To receive them, set a form service URL (e.g. Formspree) in FORM_ENDPOINT. */
const FORM_ENDPOINT = ''
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const formRules = {
  catering: {
    required: ['name', 'email', 'eventDate', 'guests'],
    extra(values, errors) {
      const guests = Number(values.guests)
      if (values.guests && (!Number.isInteger(guests) || guests < 1 || guests > 5000)) {
        errors.guests = 'Enter a number between 1 and 5000'
      }
    },
    success: (v) => `Thanks, ${v.name}! Our catering team will reach out within one business day.`,
  },
  wholesale: {
    required: ['name', 'company', 'email', 'businessType'],
    success: (v) =>
      `Thanks, ${v.name}. Your request has gone to the Royal Meats sales team. Expect pricing and a sell sheet within one business day.`,
  },
}

function clearErrors(form) {
  form.querySelectorAll('[data-error]').forEach((el) => el.remove())
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.setAttribute('aria-invalid', 'false')
    el.removeAttribute('aria-describedby')
  })
}

function showFieldError(form, name, message) {
  const field = form.querySelector(`[name="${name}"]`)
  if (!field) return
  const p = document.createElement('p')
  p.id = `${name}-error`
  p.className = 'text-sm text-destructive'
  p.dataset.error = ''
  p.textContent = message
  field.setAttribute('aria-invalid', 'true')
  field.setAttribute('aria-describedby', p.id)
  field.insertAdjacentElement('afterend', p)
}

function showFormError(form, message) {
  const p = document.createElement('p')
  p.setAttribute('role', 'alert')
  p.className = 'text-sm text-destructive md:col-span-2'
  p.dataset.error = ''
  p.textContent = message
  form.lastElementChild.insertAdjacentElement('beforebegin', p)
}

function showSuccess(form, message) {
  const box = document.createElement('div')
  box.setAttribute('role', 'status')
  box.className = 'flex flex-col gap-2 rounded-sm border border-primary bg-card p-8'
  const title = document.createElement('p')
  title.className = 'font-serif text-2xl font-bold'
  title.textContent = 'Request received'
  const body = document.createElement('p')
  body.className = 'leading-relaxed text-muted-foreground'
  body.textContent = message
  box.append(title, body)
  form.replaceWith(box)
}

async function send(formData) {
  if (!FORM_ENDPOINT) return
  await fetch(FORM_ENDPOINT, { method: 'POST', body: formData, headers: { Accept: 'application/json' } })
}

document.querySelectorAll('form[data-form="catering"], form[data-form="wholesale"]').forEach((form) => {
  const rules = formRules[form.dataset.form]
  const button = form.querySelector('button[type="submit"]')
  const label = button.textContent

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearErrors(form)

    const data = new FormData(form)
    const values = {}
    data.forEach((value, key) => {
      if (typeof value === 'string') values[key] = value.trim()
    })

    const errors = {}
    rules.required.forEach((key) => {
      if (!values[key]) errors[key] = 'Required'
    })
    if (values.email && !EMAIL_RE.test(values.email)) errors.email = 'Enter a valid email'
    if (rules.extra) rules.extra(values, errors)

    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([name, message]) => showFieldError(form, name, message))
      showFormError(form, 'Please fix the highlighted fields.')
      return
    }

    button.disabled = true
    button.textContent = 'Sending…'
    try {
      await send(data)
      showSuccess(form, rules.success(values))
    } catch {
      button.disabled = false
      button.textContent = label
      showFormError(form, 'Something went wrong. Please try again or call us.')
    }
  })
})

document.querySelectorAll('form[data-form="newsletter"]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearErrors(form)
    const data = new FormData(form)
    const email = String(data.get('email') || '').trim()
    if (!EMAIL_RE.test(email)) {
      const p = document.createElement('p')
      p.setAttribute('role', 'alert')
      p.className = 'text-sm text-destructive'
      p.dataset.error = ''
      p.textContent = 'Enter a valid email.'
      form.append(p)
      return
    }
    try {
      await send(data)
    } catch {}
    const done = document.createElement('p')
    done.setAttribute('role', 'status')
    done.className = 'text-sm text-foreground'
    done.textContent = 'You are on the list.'
    form.replaceWith(done)
  })
})
