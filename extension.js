const vscode = require('vscode');
const DISPOSABLES = [];

function activate(context) {
  const UNDO    = 1;
  let config    = vscode.workspace.getConfiguration("editor"),
      editor    = vscode.window.activeTextEditor,
      language  = editor?.document.languageId,
      isFromKbd = true,
      cflActive = language === "javascript" || language === "typescript",
      difActive = cflActive,
      smcActive = cflActive,
      tefActive = cflActive;
  
  console.log(`"Wider" is now active for ${language} language!'`);
  DISPOSABLES.push( vscode.workspace.onDidChangeTextDocument(e => e.contentChanges.length             &&
                                                                  e.contentChanges[0].text.length < 3 &&                // Silly way to check if the text change originates from a keypress
                                                                  isFromKbd                           && fixOnType(e)   // not paste see https://github.com/microsoft/vscode/issues/204018
                                                            )
                  , vscode.workspace.onDidChangeConfiguration(e => e && updateActivators())
                  , vscode.window.onDidChangeActiveTextEditor(e => e && ( editor = e
                                                                        , language = e.document.languageId
                                                                        , updateActivators()
                                                                        , console.log(`"Wider" switched to ${language} language!`)
                                                                        ))
                  );

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
      txt = txt.replace( /\/(?:\\.|[^\\\/])+(?:\/[gimuy]{0,5})|(['"`])((?:\\.|[^\\\1])*?)\1|(?<![:\/])\/\/.*$/g
                       , match => "_".repeat(match.length)
                       );
      while(cnt && pch-- > 0){
        DNSTR.includes(txt[pch]) ? cnt--
                                 :
        UPSTR.includes(txt[pch]) ? cnt++
                                 : void 0;
      }
      cnt && ( dix = txt.search(/(?<=\b(let|var)\s+)\w(?!.*\blet\b|.*\bvar\b)/)
             , dix >= 0 && (cnt = 0)
             );
      cnt && pln-- && ( txt = editor.document.lineAt(pln).text
                      , pch = txt.length
                      );
    }
    return !cnt ? mod === "Dot" ? [txt.lastIndexOf(".", pch), -1, false] 
                                :
                  dix >= 0      ? [-1, dix, false]
                                : [pch, -1, txt[pch+1] === " "]
                : [-1, -1, false];
  }

  function isInString(txt, pos){
    let mcs = [...txt.matchAll(/(['"`])((?:\\.|[^\\\1])*?)\1/g)];
    return mcs.some(m => pos.character > m.index && pos.character < m.index + m[0].length - 1);
  }

  function isInComment(txt, pos) {
    const cix = txt.search(/(?<![:\/])\/\/.*$/g);
    return cix !== -1 && pos.character > cix;
  }

  function isDeletion(chg){
    return chg.text === "" && chg.rangeLength > 0;
  }

  function moveCursorTo(lin, chr){
    const pos = new vscode.Position(lin, chr);
    editor.selection = new vscode.Selection(pos, pos);
  }

  function fixOnType(event) {
    const change = event.contentChanges[0];
    let pos = change.range.start,
        txt = event.document.lineAt(pos.line).text, 
        dix = -1,
        lix = -1,
        nix = -1,
        pix = pos.character,
        rng;

    event.reason !== UNDO  &&
    !isInComment(txt, pos) &&
    !isInString(txt, pos)  &&
    !isDeletion(change)    && ( change?.text === ":"  ? tefActive                         &&
                                                        /^.*[?:].*:|:.*[?:].*$/.test(txt) && ( nix = indexOfIndent(txt, pos, "Ter")[0]
                                                                                             , nix >= 0 && editor.edit(eb => ( isFromKbd = false
                                                                                                                             , eb.replace( new vscode.Range(pos,pos.translate(0,1))
                                                                                                                                         , "\n" + " ".repeat(nix) + ": "
                                                                                                                                         )
                                                                                                                             ))
                                                                                                                 .catch(err => console.log(err))
                                                                                                                 .finally(_ => isFromKbd = true)
                                                                                             )
                                                      :
                                change?.text === "?"  ? tefActive && ( nix = txt.lastIndexOf(":")
                                                                     , nix >= 0 && ( rng = new vscode.Range(pos.translate(0,nix - pix + 1), pos.translate(0,1))
                                                                                   , txt = editor.document.getText(rng).slice(0,-1).trim() + " "
                                                                                   , editor.edit(eb => ( isFromKbd = false
                                                                                                       , eb.replace(rng, "\n" + (txt.length < nix ? " ".repeat(nix - txt.length) : "") + txt + "? ")
                                                                                                       ))
                                                                                           .catch(err => console.log(err))
                                                                                           .finally(_ => isFromKbd = true)
                                                                                   )
                                                                     )
                                                      :
                                change?.text === ","  ? ( [nix, dix, act] = cflActive ? indexOfIndent(txt,pos)
                                                                                      : [-1, -1, false]
                                                        , nix >= 0 &&
                                                          act      ? "{([".includes(txt[nix]) ? editor.edit(eb => ( isFromKbd = false
                                                                                                                  , eb.insert(pos.translate(0, 1), " ")
                                                                                                                  , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                                  , lix = txt.slice(pix)
                                                                                                                              .search(/(?<=[^,]*,[^)}\]]*)[)}\]]/)
                                                                                                                  , lix >= 0 && eb.insert( pos.translate(0, lix)
                                                                                                                                          , "\n" + " ".repeat(nix)
                                                                                                                                          )
                                                                                                                  ))
                                                                                                      .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                                                                      .catch(err => console.log(err))
                                                                                                      .finally(_ => isFromKbd = true)
                                                                                              : editor.edit( eb => ( isFromKbd = false
                                                                                                                   , eb.insert(pos.translate(0,1), " ")
                                                                                                                   , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                                   ))
                                                                                                      .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                                                                      .catch(err => console.log(err))
                                                                                                      .finally(_ => isFromKbd = true)
                                                                   :
                                                          dix >= 0 && editor.edit(eb => ( isFromKbd = false
                                                                                        , eb.insert(pos.translate(0,1), "\n" + " ".repeat(dix))
                                                                                        ))
                                                                            .then(_  => moveCursorTo(pos.line + 1, dix))
                                                                            .catch(err => console.log(err))
                                                                            .finally(_ => isFromKbd = true)
                                                        )
                                                      :
                                change?.text === "."  ? smcActive          &&
                                                        txt[pix-1] === ")" && ( nix = indexOfIndent(txt, pos.translate(0,-1), "Dot")[0]
                                                                              , nix >= 0 && editor.edit(( isFromKbd = false
                                                                                                        , eb => eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                        ))
                                                                                                  .catch(err => console.log(err))
                                                                                                  .finally(_ => isFromKbd = true)
                                                                              )
                                                      :
                                change?.text === "{}" ? ( nix = difActive ? txt.search(/function.*\(/)
                                                                          : -1
                                                        , nix >= 0 && editor.edit(eb => ( isFromKbd = false
                                                                                        , eb.insert( pos.translate(0,1)
                                                                                                   , "\n" + " ".repeat(nix + 2) + "\n" + " ".repeat(nix)
                                                                                                   )
                                                                                        ))
                                                                            .then( _ => ( pos = new vscode.Position(pos.line + 1, nix + 2)
                                                                                        , editor.selection = new vscode.Selection(pos, pos)
                                                                                        ))
                                                                            .catch(err => console.log(err))
                                                                            .finally(_ => isFromKbd = true)
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
