import "../../../src/runtime/index";

import ko from "knockout";
import viewModel from "./viewmodel.js";

ko.applyBindings(viewModel, document.body);
