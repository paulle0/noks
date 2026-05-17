async function generateAndPublishSubkey() {
  console.log("generateAndPublishSubkey called.");
  let liMasterKeypairString = localStorage.getItem("liMasterKeypair");
  if(liMasterKeypairString !== null) {
    try {
      let liMasterKeypair = JSON.parse(liMasterKeypairString);
      let subkeyKeyringEventCreated = createPostingEvent(liMasterKeypair.sk);
      console.log("Created subkey keyring event: ");
      console.log(postingEventCreated);
      let liLedgerEventString = localStorage.getItem("liLedgerEvent");
      let liLedgerEvent = JSON.parse(liLedgerEventString);
      //Begin send
      let postedLedgerEntryEvent = sendLedgerEntryEvent(postingEventCreated, liKeypair.sk, getAccountingLedgerRelays(liLedgerEvent));
      //End send
      renderForm(liLedgerEvent);
      const el = document.getElementById('postOk');
      el.textContent = 'Entry succesfully published.';
      el.classList.add('show');
      el.scrollIntoView({ behavior:'smooth', block:'nearest' });
      console.log("Successfully published posting event.");
    } catch(error) {
      alert("Error creating posting event: " + error); return;
    }
  } else {
    alert('First log in a masterkey, before creating a subkey.'); return;
  }
}

function createPostingEvent(secK) {
  console.log("createPostingEvent called.");
  const debit     = document.getElementById('f-debit').value;
  console.log("Read debit: " + debit);
  const credit    = document.getElementById('f-credit').value;
  console.log("Read credit: " + credit);
  const amount    = parseInt(document.getElementById('f-amount').value);
  console.log("Read amount: " + amount);
  const scale     = parseInt(document.getElementById('f-scale').value);
  console.log("Read scale: " + scale);
  const unit      = document.getElementById('f-unit').value;
  const mvt       = document.getElementById('f-mvt').value;
  const partner   = document.getElementById('f-partner').value;
  const date      = document.getElementById('f-date').value;
  console.log("Read date: " + date);
  //const published = document.getElementById('f-published').value;
  const published = null;
  const desc      = document.getElementById('f-desc').value.trim();

  if (!debit)              { throw 'Select a debit account'; }
  if (!credit)             { throw 'Select a credit account'; }
  //if (debit === credit)    { alert('Debit and credit accounts must differ'); return; }
  if (isNaN(amount) || amount <= 0) { throw 'Enter a valid amount'; }
  if (!unit)               { throw 'Select a unit'; }

  //const intAmount  = Math.round(amount * Math.pow(10, scale));
  const intAmount = amount;
  const postingTs  = date      ? Math.floor(new Date(date).getTime()/1000)      : Math.floor(Date.now()/1000);
  console.log("Posting date: " + postingTs);
  
  const publishedTs= published ? Math.floor(new Date(published).getTime()/1000) : Math.floor(Date.now()/1000);
  let liLedgerString = localStorage.getItem("liLedger");
  let liLedger = JSON.parse(liLedgerString);
  let nAddrLedgerDec = NostrTools.nip19.decode(liLedger.naddr);
  const ledgerRef = "" + nAddrLedgerDec.data.kind + ":" + nAddrLedgerDec.data.pubkey + ":" + nAddrLedgerDec.data.identifier + "";

  // Build kind 7701 event template
  const eventTemplate = {
    kind: 7701,
    created_at: postingTs,   // posting period timestamp per le-accounting-nip convention
    tags: [
      ['A', ledgerRef],
      ['L', ledgerRef],
      ['l', `account:${debit}`,   ledgerRef],
      ['l', `account:${credit}`,  ledgerRef],
      ['l', `mvt_type:${mvt}`,    ledgerRef],
      ['l', `partner:${partner}`, ledgerRef],
      ['L', 'leaccountingnip'],
      ['l', 'ledgerentry', 'leaccountingnip'],
      ['published_at', String(publishedTs)],
    ],
    content: {
      "debit_account":  debit,
      "credit_account": credit,
      "acc_amount":     [intAmount, scale, unit],
      "acc_mvt_type":   mvt,
      "acc_partner":    partner,
      "description":    desc
    }
  };
  let createdPostingEvent = {};
  createdPostingEvent = NostrTools.finalizeEvent({
        kind: eventTemplate.kind,
        created_at: eventTemplate.created_at,
        tags: eventTemplate.tags,
        content: JSON.stringify(eventTemplate.content),
      }, secK);
  return createdPostingEvent;
}

function uploadBackUpFile() {
  document.getElementById("file-upload-feedback").textContent = "Function not yet implemented. To be implemented.";
}

