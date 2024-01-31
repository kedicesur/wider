const vscode = require('vscode');
const DISPOSABLES = [];

function activate(context) {
  const UNDO    = 1;
  let config    = vscode.workspace.getConfiguration("editor"),
      editor    = vscode.window.activeTextEditor,
      language  = editor.document.languageId,
      cflActive = language === "javascript" || language === "typescript",
      difActive = cflActive,
      smcActive = cflActive,
      tefActive = cflActive;
  
  console.log(`"Wider" is now active for ${editor.document.languageId} language!'`);
  editor && DISPOSABLES.push( vscode.workspace.onDidChangeTextDocument(fixOnType)
                            , vscode.workspace.onDidChangeConfiguration(updateActivators)
                            , vscode.window.onDidChangeActiveTextEditor(e => e && ( editor = e
                                                                                  , language = e.document.languageId
                                                                                  , updateActivators()
                                                                                  , console.log(`"Wider" switched to ${language} language!`)
                                                                                  ))
                            );

// Utility functions

  function updateActivators(){
    const widerConfig = vscode.workspace.getConfiguration("wider");

    language === "javascript" ||
    language === "typescript"  ? ( cflActive = widerConfig.get("commaFirstLayoutForJS/TS")
                                 , difActive = widerConfig.get("deepIndentedFunctions")
                                 , smcActive = widerConfig.get("stackedMethodChaining")
                                 , tefActive = widerConfig.get("ternaryFormatting")
                                 )
                               :
          language === "json" && ( cflActive = widerConfig.get("commaFirstLayoutForJSON")
                                 , difActive = false
                                 , smcActive = false
                                 , tefActive = false
                                 );
  }

  function indexOfIndent(txt, pos, mod){
    const [UPSTR,DNSTR] = mod === "Ter" ? [":", "?"]
                                        :
                          mod === "Dot" ? [")", "("]
                          /*Otherwise*/ : [")}]", "({["];
    let pln = pos.line,
        pch = pos.character,
        cnt = 1,
        dix; 
        
    while(cnt && pln >= 0){
      txt = txt.replace( /\/(?:\\.|[^\\\/])+(?:\/[gimuy]{0,5})|(['"`])((?:\\.|[^\\\1])*?)\1/g // Supresses the regexp and string literal parts
                       , match => "_".repeat(match.length)                                    // of the code line with "_" character in length
                       );                                                                     // TODO: Add comments as well..!
      while(cnt && pch-- > 0){
        DNSTR.includes(txt[pch]) ? cnt--
                                 :
        UPSTR.includes(txt[pch]) ? cnt++
                                 : void 0;
      }
      cnt && ( dix = txt.search(/(?<=\b(let|var)\s+)\w(?!.*\blet\b|.*\bvar\b)/)  // get the index of variable name
             , dix >= 0 && (cnt = 0)                                             // after last "let" or "var" on line
             );
      cnt && pln-- && ( txt = editor.document.lineAt(pln).text
                      , pch = txt.length
                      );
    }
    return !cnt ? mod === "Dot" ? [txt.lastIndexOf(".", pch), -1] 
                                :
                  dix >= 0      ? [-1, dix]
                                : [pch, -1]
                : [-1, -1];
  }

  function isInString(txt, pos){
    let mcs = [...txt.matchAll(/(['"`])((?:\\.|[^\\\1])*?)\1/g)];
    return mcs.some(m => pos.character > m.index && pos.character < m.index + m[0].length - 1);
  }

  function isInComment(txt, pos) {
    const cix = txt.search(/(?<![:\/])\/\/.*$/g);    // fixed https://... breaking comment test
    return cix !== -1 && pos.character > cix;
  }

  function isDeletion(chg){
    return chg.text === "" && chg.rangeLength > 0;
  }

  function moveCursorTo(lin, chr){
    const pos = new vscode.Position(lin, chr);
    editor.selection = new vscode.Selection(pos, pos);
  }

  // Formatting function

  function fixOnType(event) {
    if (!event.contentChanges?.length) return void 0;
    const change = event.contentChanges[0];
    let pos = change.range.start,                     // position of the cursor in the editor
        txt = editor.document.lineAt(pos.line).text,  // text of the current line
        dix = -1,                                     // index of the variable name if "let" or "var" definition exists
        lix = -1,                                     // last index of one of "})]"
        nix = -1,                                     // next indent index
        pix = pos.character,                          // current index of the cursor
        rng;                                          // a range variable

    event.reason !== UNDO  &&
    !isInComment(txt, pos) &&
    !isInString(txt, pos)  &&
    !isDeletion(change)    && ( change?.text === ":"  ? tefActive                         &&
                                                        /^.*[?:].*:|:.*[?:].*$/.test(txt) && ( nix = indexOfIndent(txt, pos, "Ter")[0]
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
                                change?.text === ","  ? ( [nix, dix] = cflActive ? indexOfIndent(txt,pos)
                                                                                 : [-1, -1]
                                                        , nix >= 0 ? "{([".includes(txt[nix]) ? txt[nix+1] === " " && editor.edit(eb => ( eb.insert(pos.translate(0, 1), " ")
                                                                                                                                        , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                                                        , lix = txt.slice(pix)
                                                                                                                                                   .search(/(?<=[^,]*,[^)}\]]*)[)}\]]/)
                                                                                                                                        , lix >= 0 && eb.insert( pos.translate(0, lix)
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
                                                                   :
                                                          dix >= 0 && editor.edit(eb => eb.insert(pos.translate(0,1), "\n" + " ".repeat(dix)))
                                                                            .then(_  => moveCursorTo(pos.line + 1, dix))
                                                                            .catch(err => console.log(err))
                                                        )
                                                      :
                                change?.text === "."  ? smcActive          &&
                                                        txt[pix-1] === ")" && ( nix = indexOfIndent(txt, pos.translate(0,-1), "Dot")[0]
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
  DISPOSABLES.length && context.subscriptions.push(...DISPOSABLES);
}

function deactivate(){
  DISPOSABLES.forEach(disposable => disposable.dispose);
}

module.exports = {
  activate,
  deactivate
};
