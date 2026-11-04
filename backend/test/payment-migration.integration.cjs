// Fictional pre-upgrade rows only; use --seed, apply exact psql upgrade, then --verify.
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { savedMinor } = require('../dist/payments/payment-money');
const { currencyDigits, SUPPORTED_CURRENCIES } = require('../dist/invoice/invoice-calculation');
const connection = process.env.PAYMENTS_TEST_DATABASE_URL;
if (!connection) throw Error('PAYMENTS_TEST_DATABASE_URL is required.');
const target = new URL(connection);
if (
  !['127.0.0.1', 'localhost'].includes(target.hostname) ||
  !target.pathname.startsWith('/stock_schema_')
)
  throw Error('Disposable stock_schema_* localhost database required.');
const pool = new Pool({ connectionString: connection });
const cases = [
  ['partial-paid', 'INR', 10, 2.5, 'PAID', 'SENT'],
  ['full-sent', 'INR', 10, 10, 'SENT', 'PAID'],
  ['label-only', 'USD', 10, 0, 'PAID', 'SENT'],
  ['prepaid-draft', 'INR', 3, 3, 'DRAFT', 'DRAFT'],
  ['voided', 'USD', 5, 0, 'VOIDED', 'VOIDED'],
  ['zero-sent', 'INR', 0, 0, 'SENT', 'SENT'],
  ['zero-paid', 'INR', 0, 0, 'PAID', 'PAID'],
  ['jpy', 'JPY', 300, 123.4, 'SENT', 'SENT'],
  ['kwd', 'KWD', 0.5, 0.1234, 'SENT', 'SENT'],
  ['legacy-round', 'USD', 0.67, 0, 'SENT', 'SENT'],
];
(async () => {
  if (process.argv.includes('--seed')) {
    await pool.query(
      `INSERT INTO users (id,email,"displayName","updatedAt") VALUES ('payment-migration-owner','payment-migration@example.test','Fictional migration owner',now())`,
    );
    for (const [id, currency, total, paid, status] of cases) {
      await pool.query(
        `INSERT INTO invoices(id,"userId","invoiceNumber","serviceDate","dueDate",subtotal,"taxRate","taxAmount",total,"amountPaid",status,currency,"updatedAt",notes) VALUES($1,'payment-migration-owner',$1,'2026-11-03','2026-12-03',$2,0,0,$2,$3,$4::"InvoiceStatus",$5,'2026-11-01','Original notes')`,
        [id, total, paid, status, currency],
      );
    }
    for (const id of ['row-a', 'row-b'])
      await pool.query(
        `INSERT INTO line_items(id,"invoiceId",type,description,unit,quantity,rate,amount) VALUES($1,'legacy-round','PRODUCT','Original snapshot','each',1,0.335,0.335)`,
        [id],
      );
    console.log(JSON.stringify({ seeded: cases.length, mode: 'pre-payment schema' }));
  } else if (process.argv.includes('--verify')) {
    for (const [id, currency, total, paid, , status] of cases) {
      const invoice = (
        await pool.query(
          'SELECT *, "updatedAt"::text AS "savedUpdatedAt" FROM invoices WHERE id=$1',
          [id],
        )
      ).rows[0];
      const expectedMinor = savedMinor(paid, currency);
      assert.equal(invoice.total, total);
      assert.equal(invoice.subtotal, total);
      assert.equal(invoice.status, status);
      assert.equal(invoice.notes, 'Original notes');
      assert.equal(invoice.savedUpdatedAt, '2026-11-01 00:00:00');
      assert.equal(invoice.amountPaid, Number(expectedMinor) / 10 ** currencyDigits(currency));
      const entries = (await pool.query('SELECT * FROM payment_entries WHERE "invoiceId"=$1', [id]))
        .rows;
      assert.equal(entries.length, expectedMinor > 0n ? 1 : 0);
      if (entries[0]) {
        assert.equal(entries[0].amountMinor, expectedMinor.toString());
        assert.equal(entries[0].openingSource, 'MIGRATION');
        assert.equal(entries[0].paymentDate, null);
        assert.equal(entries[0].reference, null);
      }
    }
    assert.deepEqual(
      (
        await pool.query(
          'SELECT amount FROM line_items WHERE "invoiceId"=\'legacy-round\' ORDER BY id',
        )
      ).rows.map((r) => r.amount),
      [0.335, 0.335],
    );
    for (const currency of SUPPORTED_CURRENCIES) {
      const row = (
        await pool.query(
          'SELECT payment_currency_scale($1) AS scale,payment_minor($2,$1) AS amount',
          [currency, 1.005],
        )
      ).rows[0];
      assert.equal(row.scale, 10 ** currencyDigits(currency));
      assert.equal(row.amount, savedMinor(1.005, currency).toString());
    }
    for (const value of [0, 0.29, 0.335, 1.0049999999999998, 123456789.015, 1000000000.01]) {
      assert.equal(
        (await pool.query("SELECT payment_minor($1,'INR') AS amount", [value])).rows[0].amount,
        savedMinor(value, 'INR').toString(),
      );
    }
    console.log(
      JSON.stringify({
        passed: true,
        invoices: cases.length,
        currencies: SUPPORTED_CURRENCIES.length,
        checks: [
          'opening labels and unknown dates',
          'paid amount authority/status reconciliation',
          'Draft/Voided/zero lifecycle',
          'currency rounding',
          'unchanged financial snapshots and timestamps',
        ],
      }),
    );
  } else throw Error('Use --seed or --verify.');
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
