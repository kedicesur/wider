const vscode = require('vscode');

function activate(context) {
  
	console.log('"Wider" is now active!');

  const editor     = vscode.window.activeTextEditor;
  const config     = vscode.workspace.getConfiguration("editor");
  const UNDO       = 1;
	const LISTENER_1 = editor && vscode.workspace.onDidChangeTextDocument(fixOnType);
  const LISTENER_2 = editor && vscode.workspace.onDidChangeConfiguration(updateSettings);

  let cflActive = true,
      difActive = true,
      smcActive = true,
      tefActive = true;

  
// Utility functions

  function indexOfIndent(txt, pos, mod){
    const [UPSTR,DNSTR] = mod === "Ter" ? [":", "?"]
                                        :
                          mod === "Dot" ? [")", "("]
                          /*Otherwise*/ : [")}", "({"];
    let pln = pos.line,
        pch = pos.character,
        cnt = 1;
        
    while(cnt && pln >= 0){
      while(cnt && pch-- > 0){
        DNSTR.includes(txt[pch]) ? cnt--
                                 :
        UPSTR.includes(txt[pch]) ? cnt++
                                 : void 0;
      }
      cnt && pln && ( txt = editor.document.lineAt(--pln).text
                    , pch = txt.length
                    );
    }
    return !cnt ? mod === "Dot" ? txt.lastIndexOf(".", pch)
                                : pch
                : -1;
  }

  function isInString(txt, pos){
    let mcs = [...txt.matchAll(/(['"`])((?:\\.|[^\\\1])*?)\1/g)];
    return mcs.some(m => pos.character > m.index && pos.character < m.index + m[0].length - 1);
  }

  function isInComment(txt, pos) {true
    const cix = txt.indexOf("//");
    return cix !== -1 && pos.character > cix;
  }

  function isDeletion(chg){
    return chg.text === "" && chg.rangeLength > 0;
  }

  function moveCursorTo(lin, chr){
    const pos = new vscode.Position(lin, chr);
    editor.selection = new vscode.Selection(pos, pos);
  }

  // Update Settings Function

  function updateSettings(event){

    event.affectsConfiguration("wider.commaFirstLayout")      ? cflActive = !cflActive
                                                              :
    event.affectsConfiguration("wider.deepIndentedFunctions") ? difActive = !difActive
                                                              :
    event.affectsConfiguration("wider.stackedMethodChaining") ? smcActive = !smcActive
                                                              :
    event.affectsConfiguration("wider.ternaryFormatting")     ? tefActive = !tefActive
                                                              : void 0;
  }

  // Formatting function

	function fixOnType(event) {
		const change = event.contentChanges[0];

    let pos = change.range.start,                     // position of the cursor in the editor
        txt = editor.document.lineAt(pos.line).text,  // text of the current line
        cix = -1,                                     // index of the last comma in line
        dix = -1,                                     // index of the variable name if let or var definition exists
        nix = -1,                                     // next indent index
        pix = pos.character,                          // current index of the cursor
        rng;                                          // a range variable

    event.reason !== UNDO  &&
    !isInComment(txt, pos) &&
    !isInString(txt, pos)  &&
    !isDeletion(change)    && ( change?.text === ":"  ? /^.*[?:].*:|:.*[?:].*$/.test(txt) &&
                                                        tefActive                         && ( nix = indexOfIndent(txt, pos, "Ter")
                                                                                             , nix >= 0 && editor.edit(eb => eb.replace( new vscode.Range(pos,pos.translate(0,1))
                                                                                                                                       , "\n" + " ".repeat(nix) + ": "
                                                                                                                                       ))
                                                                                                                 .catch(err => console.log(err))
                                                                                             )
                                                      :
                                change?.text === "?"  ? tefActive && ( nix = txt.lastIndexOf(":")
                                                                     , nix >= 0 && ( rng = new vscode.Range(pos.translate(0,nix - pix + 1), pos.translate(0,1))
                                                                                   , txt = editor.document.getText(rng).slice(0,-1).trim() + " "
                                                                                   , editor.edit(eb => eb.replace(rng, "\n" + (txt.length < nix ? " ".repeat(nix - txt.length) : "") + txt + "? "))
                                                                                           .catch(err => console.log(err))
                                                                                   )
                                                                     )
                                                      :
                                change?.text === ","  ? ( nix = cflActive ? indexOfIndent(txt,pos)
                                                                          : -1
                                                        , nix >= 0 ? txt[nix] === "{" ||
                                                                     txt[nix] === "(" ? txt[nix+1] === " " && editor.edit(eb => ( eb.insert(pos.translate(0, 1), " ")
                                                                                                                                , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                                                , /,\s*[)}]+$/.test(txt) && eb.insert( pos.translate(0,1)
                                                                                                                                                                     , "\n" + " ".repeat(nix)
                                                                                                                                                                     )
                                                                                                                                ))
                                                                                                                    .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                                                                                    .catch(err => console.log(err))
                                                                                      : editor.edit( eb => ( eb.insert(pos.translate(0,1), " ")
                                                                                                           , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                           ))
                                                                                              .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                                                              .catch(err => console.log(err))
                                                                   : ( dix = txt.slice(0, pix)                                          // get the index of variable name
                                                                                .search(/(?<=\b(let|var)\s+)\w(?!.*\blet\b|.*\bvar\b)/) // after last let or var on line
                                                                     , dix >= 0 ? editor.edit(eb => eb.insert(pos.translate(0,1), "\n" + " ".repeat(dix)))
                                                                                        .then(_  => moveCursorTo(pos.line + 1, dix))
                                                                                        .catch(err => console.log(err))
                                                                                : ( cix = txt.search(/(?<=^\s*),/)
                                                                                  , cix !== pix && 
                                                                                    cix >= 0    && editor.edit(eb => ( eb.insert(pos.translate(0,1), " ")
                                                                                                                     , eb.insert(pos, "\n" + " ".repeat(cix))
                                                                                                                     ))
                                                                                                         .then(_ => moveCursorTo(pos.line + 1, cix + 2))
                                                                                                         .catch(err => console.log(err))
                                                                                  )
                                                                     )
                                                        )
                                                      :
                                change?.text === "."  ? smcActive          &&
                                                        txt[pix-1] === ")" && ( nix = indexOfIndent(txt, pos.translate(0,-1), "Dot")
                                                                              , nix >= 0 && editor.edit(eb => eb.insert(pos, "\n" + " ".repeat(nix)))
                                                                                                  .catch(err => console.log(err))
                                                                              )
                                                      :
                                change?.text === "{}" ? ( nix = difActive ? txt.search(/function.*\(/)
                                                                          : -1
                                                        , nix >= 0 && editor.edit(eb => eb.insert( pos.translate(0,1)
                                                                                                 , "\n" + " ".repeat(nix + 2) + "\n" + " ".repeat(nix)
                                                                                                 ))
                                                                            .then( _ => ( pos = new vscode.Position(pos.line + 1, nix + 2)
                                                                                        , editor.selection = new vscode.Selection(pos, pos)
                                                                                        ))
                                                                            .catch(err => console.log(err))
                                                        )
                                                      : void 0
                              );
	}

  config.update("formatOnType", false, vscode.ConfigurationTarget.Global);
  config.update("autoClosingBrackets", "always", vscode.ConfigurationTarget.Global);
  context.subscriptions.push(LISTENER_1, LISTENER_2);
}

function deactivate(){
}

module.exports = {
	activate,
	deactivate
};
