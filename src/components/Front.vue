<template>
  <div class="container">
  <h3>Messages</h3>
    {{ message }}
  <button  @click="getAddresses()" class="sign">Get Addresses</button>
  <div v-if="accountsRetrieved">
  <button  @click="subscribeAll()" class="sign">Subscribe All</button>
  <h3>Accounts</h3>
  <hr>
  <table>
    <thead>
      <th>address</th>
      <th>description</th>
      <th>subscribed</th>
    </thead>
    <tbody>
      <tr v-for="account in addresses">
        <td>{{account.address}}</td>
        <td>{{account.description}}</td>
        <td v-if="account.subscribed"><button @click="toggleSubscribe(account.address)" class="sign">unsubscribe</button></td>
        <td v-else><button @click="toggleSubscribe(account.address)" class="sign">subscribe</button></td>
      </tr>
    </tbody>
  </table>
</div>
</div>
</template>
<script>
export default {
  name: 'FrontPage',
  data() {
    return {
        accountsRetrieved: false,
        message: [{}],
	addresses: [{}]
    }
  },
  created () {
    const socket = this.$socketClient
    socket.onMessage = msg => {
     console.log('Got message from server:', msg.data)
    }
    socket.onClose = () => {
      console.log('socket closed')
    }
    socket.reconnect = () => {
      const accounts = []
      for (let i=0; i < this.addresses.length; i++) {
         if (this.addresses[i].subscribed == true)
           accounts.push(this.addresses[i].address)
      }
     if (accounts.length>1)
       do_subscribe(accounts)

    }
    socket.onError = () => {
      console.log('socket error')
    }
   const AWAITING = {}
   const handleResponse = function(data) {
     if (!data.hasOwnProperty("id")) {
        console.error("Got response event without ID:", data)
        return
     }
     if (AWAITING.hasOwnProperty(data.id)) {
      AWAITING[data.id].resolve(data)
     } else {
      console.warn("Response to un-awaited request w/ ID " + data.id)
     }
   }
  let autoid_n = 0
  function api_request(options) {
    if (socket.readyState === 0) {
      console.error("Socket is not connected yet")
      return
    }
    if (!options.hasOwnProperty("id")) {
      options.id = "autoid_" + (autoid_n++)
    }

    let resolveHolder;
    AWAITING[options.id] = new Promise((resolve, reject) => {
    // Save the resolve func to be called by the handleResponse function later
      resolveHolder = resolve
      try {
        // Use the socket opened in the previous example...
        socket.send(JSON.stringify(options))
       } catch(error) {
         reject(error)
       }
    })
    AWAITING[options.id].resolve = resolveHolder;
    return AWAITING[options.id]
  }

  const WS_HANDLERS = {"response": handleResponse}
  socket.onMessage = msg => {
  const parsed_data = JSON.parse(msg.data)
  if (WS_HANDLERS.hasOwnProperty(parsed_data.type)) {
    // Call the mapped handler
    WS_HANDLERS[parsed_data.type](parsed_data)
      this.message.push(parsed_data)
} else {
      console.log("Unhandled message from server", msg)
    }}

  // Demonstrate api_request functionality
  async function pingpong() {
    console.log("Ping...")
    const response = await api_request({command: "ping"})
    console.log("Pong!", response)
  }

  async function do_subscribe(accounts) {
    const sub_response = await api_request({
      command:"subscribe",
      accounts: accounts
    })
    if (sub_response.status === "success") {
      console.log("Successfully subscribed!")
    } else {
      console.error("Error subscribing: ", sub_response)
    }
  }

  const log_tx = function(tx) {
  console.log(tx.transaction.TransactionType + " transaction sent by " +
              tx.transaction.Account +
              "\n  Result: " + tx.meta.TransactionResult +
              " in ledger " + tx.ledger_index +
              "\n  Validated? " + tx.validated)
  }
  WS_HANDLERS["transaction"] = log_tx   
   socket.onOpen = () => {
      console.log('socket connected')
      pingpong()
   }
  },
  methods: {
  async toggleSubscribe(address) {
    for (let i=0; i < this.addresses.length; i++) {
      if (this.addresses[i].address==address) {
         if (this.addresses[i].subscribed == true)	
           this.addresses[i].subscribed = false
         else{
            this.addresses[i].subscribed = true
            this.$socketClient.reconnect()  
         }
       }
    }
   },	
  async getAddresses() {
      this.accountsRetrieved = true
      const  resp = await fetch("https://xrp.firmfoundation.io/.well-known/xrp-ledger.toml")
      const htmlData = await resp.text()
      const inputArray = htmlData.split('\n')
      console.log(inputArray)
      var rowString 
      for (let i=0; i < inputArray.length; i++){
        var line = inputArray[i]
        if (line.startsWith("address")) {
           this.addresses.push({ "address": line.substr(inputArray[i].length-35,34), 
		"description": inputArray[i+2], "subscribed": false })   
         }
      }
      this.addresses.splice(0,1)
  },
 async subscribeAll() {
   for (let i=0; i < this.addresses.length; i++) {
     this.addresses[i].subscribed = true
   }  
   this.$socketClient.reconnect()     
  }  
}
}
</script>
<style scoped></style>
