import { createApp } from 'vue'
import App from './App.vue'
import VueSimpleWebsocket from 'vue-simple-websocket';

const app = createApp(App)
app.use(VueSimpleWebsocket, "wss://wss.firmfoundation.io:6007", {
    reconnectEnabled: true,
    reconnectInterval: 5000
});

app.mount('#app')
