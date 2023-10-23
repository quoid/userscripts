import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/mode/css/css.js";
import "codemirror/addon/comment/comment.js";
import "codemirror/addon/comment/continuecomment.js";
import "codemirror/addon/selection/active-line.js";
import "codemirror/addon/edit/closebrackets.js";
import "codemirror/addon/edit/matchbrackets.js";
import "codemirror/addon/hint/show-hint.js";
import "codemirror/addon/hint/javascript-hint.js";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/fold/indent-fold.js";
import "codemirror/addon/search/searchcursor.js";
import "codemirror/addon/search/match-highlighter.js"; // disabled
import "codemirror/addon/lint/lint.js";
import "codemirror/addon/lint/javascript-lint.js";

import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/lint/lint.css";

import "cm-show-invisibles/lib/show-invisibles.js";

export default CodeMirror;
