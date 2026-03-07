import { registerRootComponent } from "expo";
import App from "./src/App";
// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// It also ensures the right environment (Expo Go / dev client / standalone) setup.
registerRootComponent(App);
