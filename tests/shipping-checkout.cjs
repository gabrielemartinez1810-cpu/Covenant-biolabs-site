// Run: npm install --no-save --package-lock=false jsdom
//      node tests/shipping-checkout.cjs
// Executes the real inline checkout scripts in a DOM. Both submission channels
// are intercepted; no customer order, payment, or email is sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..');
const money = value => '$' + value.toFixed(2);

function load(file) {
  const errors = [], posted = [], submitted = [], sequence = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => {
    if (error.type !== 'css-parsing') errors.push(error.message);
  });
  // External resources are disabled; all inline scripts execute in page order.
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'), {
    url: 'https://cbl.test/' + file, runScripts: 'dangerously', virtualConsole,
    beforeParse(window) {
      window.alert = () => {};
      window.fetch = async (url, options) => {
        assert.equal(new URL(url).hostname, 'script.google.com');
        assert.equal(options.method, 'POST');
        posted.push(JSON.parse(options.body));
        sequence.push('sheet');
        return {};
      };
      window.HTMLFormElement.prototype.submit = function() {
        submitted.push(Object.fromEntries(new window.FormData(this)));
        sequence.push('form');
      };
    }
  });
  const w = dom.window;
  w.cblAuthUser = {id: 'shipping-test'};
  return {dom, w, errors, posted, submitted, sequence};
}

(async () => {
  let passed = 0;
  for (const file of ['shop.html', 'index.html']) {
    let state = load(file), w = state.w;
    assert.equal(w.getCblShippingCharge(), 0);
    assert.equal(w.document.getElementById('cartTotal').textContent, 'Estimated Total: $0.00');
    w.renderCartCheckout();
    assert.equal(w.document.querySelector('#cartCheckout form'), null);
    await w.submitCblOrderToSheet({preventDefault(){}, target: w.document.createElement('form')});
    assert.equal(state.posted.length, 0);
    assert.equal(state.submitted.length, 0);
    assert.deepEqual(state.errors, []);
    state.dom.window.close(); passed++;

    const cases = [
      {name: 'single item', price: 120, quantity: 1, expected: 130},
      {name: 'multiple quantities', price: 120, quantity: 2, expected: 250},
      {name: 'cents', price: 19.99, quantity: 3, expected: 69.97},
      {name: 'multiple products', price: 120, quantity: 1, extra: true, expected: 190},
    ];
    if (file === 'index.html') cases.push(
      {name: 'affiliate', price: 120, quantity: 1, code: 'MYPLUGMIKE', expected: 118, commission: 16.2},
      {name: 'invalid affiliate', price: 120, quantity: 1, code: 'INVALID', expected: 130},
      {name: 'bulk and affiliate', price: 120, quantity: 5, bundles: 2, bulk: .15, code: 'MYPLUGMIKE', expected: 928, commission: 137.7},
      {name: 'bulk only', price: 120, quantity: 5, bulk: .15, expected: 520},
    );
    for (const test of cases) {
      state = load(file); w = state.w;
      const items = [{name: 'Test item', price: test.price, priceText: money(test.price), quantity: test.quantity,
        vialQty: test.quantity, bundleCount: test.bundles || 1, bulkDiscountRate: test.bulk || 0}];
      if (test.extra) items.push({name: 'Second item', price: 60, priceText: '$60', quantity: 1});
      w.eval('cart = ' + JSON.stringify(items));
      if (test.code) w.localStorage.setItem('cbl_affiliate_code', test.code);
      w.openCart(); w.renderCartCheckout();
      const displayed = w.document.getElementById('cartTotal').textContent;
      assert(displayed.includes('Shipping: $10.00'), test.name + ' shipping visible');
      assert(displayed.includes(money(test.expected)), test.name + ' total visible');
      const formElement = w.document.querySelector('#cartCheckout form');
      const fields = Object.fromEntries(new w.FormData(formElement));
      assert.equal(fields['Shipping Charged'], '10.00');
      assert.equal(fields['Shipping Cost'], '10.00');
      assert.equal(fields['Final Total'], test.expected.toFixed(2));
      for (const key of ['Order Summary', 'Products Requested']) {
        assert(fields[key].includes('Shipping: $10.00'));
        assert(fields[key].includes(money(test.expected)));
      }
      if (file === 'index.html') {
        assert.equal(w.document.getElementById('cblNewTotalText').textContent, money(test.expected));
        assert.equal(w.document.getElementById('cblShippingText').textContent, '$10.00');
      }
      // Verify submission refreshes cached fields rather than trusting old values.
      formElement.elements.namedItem('Final Total').value = '0.00';
      formElement.elements.namedItem('Shipping Charged').value = '0.00';
      await w.submitCblOrderToSheet({preventDefault(){}, target: formElement});
      assert.equal(state.posted.length, 1);
      assert.equal(state.submitted.length, 1);
      assert.deepEqual(state.sequence, ['sheet', 'form']);
      const payload = state.posted[0], form = state.submitted[0];
      assert.equal(payload.shippingCharged, 10);
      assert.equal(payload.shippingCost, 10);
      assert.equal(payload.finalTotal, test.expected);
      assert.equal(Number(form['Final Total']), payload.finalTotal);
      assert.equal(Number(form['Shipping Charged']), payload.shippingCharged);
      assert.equal(Number(form['Shipping Cost']), payload.shippingCost);
      assert.equal(Number(form['Total Discount']), payload.discount);
      const itemSubtotal = payload.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      assert.equal(Number(itemSubtotal.toFixed(2)), payload.subtotal);
      assert.equal(Number((itemSubtotal - payload.discount + payload.shippingCharged).toFixed(2)), payload.finalTotal);
      if (test.commission) assert.equal(payload.affiliateCommission, test.commission);
      assert.equal(form['Order Summary'], fields['Order Summary']);
      assert.equal(form['Products Requested'], fields['Products Requested']);
      assert.deepEqual(state.errors, []);
      console.log('PASS', file, test.name, money(test.expected));
      state.dom.window.close(); passed++;
    }
    state = load(file); w = state.w;
    w.addToCart({name: 'Test item', price: '$120'});
    w.openCart(); w.renderCartCheckout(); w.changeCartQuantity(0, 1);
    const total = () => w.document.querySelector('[name="Final Total"]').value;
    assert.equal(total(), '250.00');
    w.addToCart({name: 'Second item', price: '$60'});
    assert.equal(total(), '310.00');
    if (file === 'index.html') {
      const input = w.document.querySelector('[name="Affiliate Code"]');
      input.value = 'MYPLUGMIKE'; w.handleCblAffiliateInput(input);
      assert.equal(total(), '280.00');
      input.value = ''; w.handleCblAffiliateInput(input);
      assert.equal(total(), '310.00');
    }
    w.removeCartItem(1); w.removeCartItem(0);
    assert.equal(w.getCblShippingCharge(), 0);
    assert.equal(w.document.querySelector('#cartCheckout form'), null);
    assert.equal(w.document.getElementById('cartTotal').textContent, 'Estimated Total: $0.00');
    assert.deepEqual(state.errors, []);
    state.dom.window.close(); passed++;
  }
  console.log(`PASS: ${passed} checkout scenarios; no real orders sent.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
