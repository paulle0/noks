async function getKeyringEvent(pubK, relays, secK) {
  console.log("getKeyringEvent called.");
  const pool = new NostrTools.SimplePool();
  console.log("Masterkey relays: " + relays);
  function authF(eventA) {
    console.log("Relay authentication.");
    return NostrTools.finalizeEvent(eventA, secK);
  }
  console.log("Try get event.");
  try {
    const event = await pool.get(
      relays,
      {
        kinds: [17791],
        authors: [pubK]
      },
      { onauth : authF }
    );
    console.log('Event from Relay: ', event);
    if (event == null) { 
      return null; 
    } else if (!NostrTools.verifyEvent(event)) {
      throw "Not valid event received from relay.";
    } else if (event.kind != 17791 || event.pubkey != pubK) {
      throw "Not correct event received from relay.";
    } else {
      return event; 
    }
  } catch (error) {
    throw error;
  }
  return null;
}

async function sendKeyringEvent(keyringEvent, secK, relays) {
  console.log("sendKeyringEvent called.");
  const pool = new NostrTools.SimplePool();
  console.log("Send Keyring event.");
  console.log("Send relays: " + relays);
  function authF(eventA) {
    console.log("Relay authentication.");
    return NostrTools.finalizeEvent(eventA, secK);
  }
  try {
    await Promise.any(pool.publish(relays, keyringEvent, { onauth : authF }));
    await delay(1);
    const event = await pool.get(
      relays,
      {
        ids: [ keyringEvent.id ],
      },
      { onauth : authF }
    );
    console.log('Event sent from Relay: ', event);
    if(event == null) { 
      throw "Error when saving on relay!"; 
    } else if (!NostrTools.verifyEvent(event)) {
      throw "Not valid event received from relay after saving.";
    } else if (event.id != keyringEvent.id) {
      throw "Not correct event received from relay after saving.";
    } else {
      return event;
    }
  } catch (error) {
    throw error;
  }
  return null;
}

function delay(n) {
  console.log("delay called.");
  return new Promise(function(resolve) {
    setTimeout(resolve, n * 1000);
  });
}
