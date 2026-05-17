async function generateAndPublishSubkey() {
  console.log("generateAndPublishSubkey called.");
  let liMasterKeypairString = localStorage.getItem("liMasterKeypair");
  if(liMasterKeypairString !== null) {
    try {
      let liMasterKeypair = JSON.parse(liMasterKeypairString);
      let liKeyringEventString = localStorage.getItem("liKeyringEvent");
      let liKeyringEvent = JSON.parse(liKeyringEventString);
      let subkeyKeyringEventCreated = createPublishEvent(liKeyringEvent, liMasterKeypair.sk);
      console.log("Created subkey keyring event: ");
      console.log(subkeyKeyringEventCreated);
      //Begin send
      let postedKeyringEvent = await sendKeyringEvent(subkeyKeyringEventCreated, liMasterKeypair.sk, [ liMasterKeypair.relay ]);
      //End send
      localStorage.setItem("liKeyringEvent", JSON.stringify(postedKeyringEvent));
      const el = document.getElementById('publishOk');
      el.textContent = 'Subkey succesfully published to keyring. View under menu-point "View Keyring"';
      el.classList.add('show');
      el.scrollIntoView({ behavior:'smooth', block:'nearest' });
      console.log("Successfully published subkey keyring event.");
    } catch(error) {
      alert("Error creating keyring event for subkey: " + error); return;
    }
  } else {
    alert('First log in a masterkey, before creating a subkey.'); return;
  }
}

function createPublishEvent(keyringOld, secKMaster) {
  console.log("createPublishEvent called.");
  const name = document.getElementById('subkeyNameInput').value;
  console.log("Read name: " + name);
  const description = document.getElementById('subkeyDescriptionInput').value;
  console.log("Read description: " + description);
  const relation = "S";
  const functionV = ["signing", "certify", "encryption", "authentication"];
  let pubK = "";
  let secK = "";
  try {
    let skDec = NostrTools.generateSecretKey();
    let skHex = NostrTools.utils.bytesToHex(skDec);
    let sk = NostrTools.nip19.nsecEncode(skDec);
    console.log("created nsec in dec, hex, bech32: ");
    console.log(skDec);
    console.log(skHex);
    console.log(sk);
    let pkHex = NostrTools.getPublicKey(skDec);
    let pk = NostrTools.nip19.npubEncode(pkHex);
    let pkShort = pk.slice(0,8) + "..." + pk.slice(-8);
    console.log("npub hex, bech32 and short: ");
    console.log(pkHex);
    console.log(pk);
    console.log(pkShort);
    pubK = pkHex;
    secK = skHex;
  } catch (error) {
    throw error;
  }
  
  if (keyringOld) {
    let keyringNew = keyringOld;
    keyringNew.created_at = Math.floor(Date.now()/1000);
    keyringNew.tags.push(['S', pubK, "signing", "certify", "encryption", "authentication"]);
    let content = JSON.parse(keyringNew.content);
    content.push( { relation: relation, name: name, description: description, pubkey: pubK, seckey: secK, function: functionV } );
    keyringNew.content = JSON.stringify(content);
    let createdPublishEvent = null;
    createdPublishEvent = NostrTools.finalizeEvent({
          kind: keyringNew.kind,
          created_at: keyringNew.created_at,
          tags: keyringNew.tags,
          content: keyringNew.content,
        }, secKMaster);
    console.log("Updated Keyring event:");
    console.log(createdPublishEvent);
    return createdPublishEvent;
  } else {
    // Build kind 17791 event template
    const eventTemplate = {
      kind: 17791,
      created_at: Math.floor(Date.now()/1000), 
      tags: [
        ['S', pubK, "signing", "certify", "encryption", "authentication"],
      ],
      content: [
        { relation: relation, name: name, description: description, pubkey: pubK, seckey: secK, function: functionV }
      ]
    };
    let createdPublishEvent = null;
    createdPublishEvent = NostrTools.finalizeEvent({
          kind: eventTemplate.kind,
          created_at: eventTemplate.created_at,
          tags: eventTemplate.tags,
          content: JSON.stringify(eventTemplate.content),
        }, secKMaster);
    return createdPublishEvent;
  }
}

