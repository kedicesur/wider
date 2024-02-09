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
      tefActive = cflActive,
      _resolve,
      fixNext   = new Promise(resolve => _resolve = resolve);
  
  console.log(`"Wider" is now active for ${language} language!'`);
  DISPOSABLES.push( vscode.workspace.onDidChangeTextDocument(e => ( e.contentChanges.length &&
                                                                  //  e.contentChanges[0].text.length < 3 && // Silly way to check if the text change originates from a keypress
                                                                    isFromKbd               && fixOnType(e)  // not paste see https://github.com/microsoft/vscode/issues/204018
                                                                  )
                                                            )
                  , vscode.workspace.onDidChangeConfiguration(e => e && updateActivators())
                  , vscode.window.onDidChangeActiveTextEditor(e => e && ( editor = e
                                                                        , language = e.document.languageId
                                                                        , updateActivators()
                                                                        , console.log(`"Wider" switched to ${language} language!`)
                                                                        ))
                  , vscode.commands.registerTextEditorCommand( "wider.widenSelection"
                                                             , fixSelection
                                                             )
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

  function suppressIrrelevantCharacters(str){
    return str.replace( /\/(?:\\.|[^\\\/])+(?:\/[gimuy]{0,5})|(['"`])((?:\\.|[^\\\1])*?)\1|(?<![:\/])\/\/.*$/g // Suppresses the regexp, string literal
                      , match => "_".repeat(match.length)                                                      // and comment parts of the given string
                      );                                                                                       // with "_" character in the same length
  }

  function indexOfIndent(txt, pos, mod){
    const [UPSTR,DNSTR] = mod === "t" ? [":", "?"]
                                      :
                          mod === "." ||
                          mod === ")" ? [")", "("]
                                      :
                          mod === "}" ? ["}", "{"]
                                      :
                          mod === "]" ? ["]", "["]
                         /*Otherwise*/: [")}]", "({["];
    let pln = pos.line,
        pch = pos.character,
        cnt = 1,
        tps,
        dix;
        
    while(cnt && pln >= 0){
      txt = suppressIrrelevantCharacters(txt);
      while(cnt && pch-- > 0){
        DNSTR.includes(txt[pch]) ? mod === "t" ? ( tps = bypassObject(pos = new vscode.Position(pln,pch))
                                                 , tps !== pos ? ( pos = tps
                                                                 , txt = suppressIrrelevantCharacters(editor.document.lineAt(pos.line).text)
                                                                 , pln = pos.line
                                                                 , pch = pos.character
                                                                 )
                                                               : cnt--
                                                 )
                                               : cnt--
                                 :
        UPSTR.includes(txt[pch]) ? mod === "t" ? ( tps = bypassObject(pos = new vscode.Position(pln,pch))
                                                 , tps !== pos ? ( pos = tps
                                                                 , txt = suppressIrrelevantCharacters(editor.document.lineAt(pos.line).text)
                                                                 , pln = pos.line
                                                                 , pch = pos.character
                                                                 )
                                                               : cnt++
                                                 )
                                               : cnt++
                                 : void 0;
      }
      cnt && ( dix = txt.search(/(?<=\b(let|var)\s+)\w(?!.*\blet\b|.*\bvar\b)/)  // get the index of variable name
             , dix >= 0 && (cnt = 0)                                             // after last "let" or "var" on line
             );
      cnt && pln-- && ( txt = editor.document.lineAt(pln).text
                      , pch = txt.length
                      );
    }console.log("count:",cnt);
    return !cnt ? mod === "." ? [txt.lastIndexOf(".", pch), -1, false] 
                              :
                  dix >= 0    ? [-1, dix, false]
                              : [pch, -1, txt[pch+1] === " "]
                : [-1, -1, false];
  }

  function bypassObject(pos){
    const [UPSTR,DNSTR] = ["}", "{"];
    let pln = pos.line,
        pch = pos.character,
        cnt = 1,
        txt = editor.document.lineAt(pln).text.slice(0,pch);

    while(cnt && pln >= 0){
      txt = suppressIrrelevantCharacters(txt);
      while(cnt && pch-- > 0){
        DNSTR.includes(txt[pch]) ? cnt--
                                 :
        UPSTR.includes(txt[pch]) ? cnt++
                                 : void 0;
      }
      cnt && pln-- && ( txt = editor.document.lineAt(pln).text
                      , pch = txt.length
                      );
    }console.log(cnt, /\)\s*\{/.test(txt.slice(0,pch+1)))
    return !cnt ? /\)\s*\{/.test(txt.slice(0,pch+1)) ? pos
                                                     : new vscode.Position(pln,pch)
                : pos;
  }

  function isDontCare(txt, pos){
    let mcs = [...txt.matchAll(/\/(?:\\.|[^\\\/])+(?:\/[gimuy]{0,5})|(['"`])((?:\\.|[^\\\1])*?)\1|(?<![:\/])\/\/.*$/g)];
    return mcs.some(m => pos.character > m.index && pos.character < m.index + m[0].length);
  }

  function isDeletion(chg){
    return chg.text === "" && chg.rangeLength > 0;
  }

  function moveCursorTo(lin, chr){
    const pos = new vscode.Position(lin, chr);
    editor.selection = new vscode.Selection(pos, pos);
  }

  // Formatting functions

  function fixSelection(editor){
    let pos = editor.selection.start,
        txt = editor.document.getText(editor.selection)
        sup = suppressIrrelevantCharacters(txt);console.log("en baş:",txt,sup)
    txt.split("")
       .reduce( (d,c,i) => ( "{[(".includes(sup[i]) ? ( d[1].length && (d[1][d[1].length-1] = d[1][d[1].length-1].trim())
                                                      , d[1].push(c+" ","")
                                                      )
                                                    :
                             "}])".includes(sup[i]) ? ( d[1].length && ( d[1][d[1].length-1] = d[1][d[1].length-1].trim()
                                                                       , d[0].push(d[1].join(""))
                                                                       )
                                                      , d[0].push(c)
                                                      , d[1].length = 0
                                                      )
                                                    :
                             sup[i] === ","         ? ( d[1].length && ( d[1][d[1].length-1] = d[1][d[1].length-1].trim()
                                                                       , d[0].push(d[1].join(""))
                                                                       )
                                                      , d[0].push(c)
                                                      , d[1].length = 0
                                                      )
                                                    :
                             sup[i] !== "\n"        ? d[1].length ? (d[1][d[1].length-1] += c)
                                                                  : d[1].push(c)
                                                    : void 0
                           , d
                           )
              , [[],[]]
              )[0]
       .reduce( (p,s) => s !== "" ? p.then(_ => ( console.log("yeni işlem:", s, pos.line,pos.character)
                                                , fixNext = new Promise(resolve => _resolve = resolve)
                                                , editor.edit(eb => eb.insert(pos,s))
                                                , fixNext
                                                ))
                                     .then(_ => ( pos = editor.selection.active.translate(0,s.length)
                                                , console.log("pos a geldim ve yeni pos:", pos.line, pos.character)
                                                ))
                                  : p
              , editor.edit(eb => eb.replace( editor.selection, ""))
              )
  }
  
  // TODO - Comma-First: When applied "," is followed by a string thats ending with ?multiple? terminators like ")]}" it gets confused
  function fixOnType(event) {
    const change = event.contentChanges[0];
    const chgtxt = change?.text;
    let pos = change.range.start,                    // position of the cursor in the editor
        txt = event.document.lineAt(pos.line).text,  // text of the current line
        act = true,                                  // comma-first activator carried from indexOfIndent()
        dix = -1,                                    // index of the variable name if "let" or "var" definition exists
        lix = -1,                                    // last index of one of "})]"
        nix = -1,                                    // next indent index
        pix = pos.character,                         // current index of the cursor
        rng;                                         // a range variable
    console.log("fixOnType:",change);
    event.reason !== UNDO &&
    !isDontCare(txt, pos) &&
    !isDeletion(change)   ? ( chgtxt === ":"  ? tefActive                &&
                                                pos === bypassObject(pos) ? ( nix = indexOfIndent(txt, pos, "t")[0]
                                                                            , console.log(nix)
                                                                            , nix >= 0 ? editor.edit(eb => ( isFromKbd = false
                                                                                                           , eb.replace( new vscode.Range(pos,pos.translate(0,1))
                                                                                                                       , "\n" + " ".repeat(nix) + ": "
                                                                                                                       )
                                                                                                           ))
                                                                                       : Promise.resolve()
                                                                            )
                                                                          : Promise.resolve()
                                              :
                              chgtxt === "?"  ? tefActive         && 
                                                txt[pix-1] === " " ? ( nix = txt.lastIndexOf(":")
                                                                     , nix >= 0 ? ( rng = new vscode.Range(pos.translate(0,nix - pix + 1), pos.translate(0,1))
                                                                                  , txt = editor.document.getText(rng).slice(0,-1).trim() + " "
                                                                                  , editor.edit(eb => ( isFromKbd = false
                                                                                                      , eb.replace(rng, "\n" + (txt.length < nix ? " ".repeat(nix - txt.length) : "") + txt + "? ")
                                                                                                      ))
                                                                                  )
                                                                                : Promise.resolve()
                                                                     )
                                                                   : Promise.resolve()
                                              :
                              chgtxt === ","  ? ( [nix, dix, act] = cflActive ? indexOfIndent(txt,pos)
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
                                                                                      : editor.edit( eb => ( isFromKbd = false
                                                                                                           , eb.insert(pos.translate(0,1), " ")
                                                                                                           , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                           ))
                                                                                              .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                           :
                                                  dix >= 0 ? editor.edit(eb => ( isFromKbd = false
                                                                               , eb.insert(pos.translate(0,1), "\n" + " ".repeat(dix))
                                                                               ))
                                                                   .then(_  => moveCursorTo(pos.line + 1, dix))
                                                           : Promise.resolve()
                                                )
                                              :
                              chgtxt === "."  ? smcActive          &&
                                                txt[pix-1] === ")" ? ( nix = indexOfIndent(txt, pos.translate(0,-1), ".")[0]
                                                                     , nix >= 0 && editor.edit(( isFromKbd = false
                                                                                               , eb => eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                               ))
                                                                     )
                                                                   : Promise.resolve()
                                              :
                              chgtxt === "{}" ? ( nix = difActive ? txt.search(/function.*\(/)
                                                                  : -1
                                                , nix >= 0 ? editor.edit(eb => ( isFromKbd = false
                                                                               , eb.insert( pos.translate(0,1)
                                                                                         , "\n" + " ".repeat(nix + 2) + "\n" + " ".repeat(nix)
                                                                                         )
                                                                               ))
                                                                   .then( _ => ( pos = new vscode.Position(pos.line + 1, nix + 2)
                                                                               , editor.selection = new vscode.Selection(pos, pos)
                                                                               ))
                                                           : Promise.resolve()
                                                )
                                              :
                              chgtxt === "}" ||
                              chgtxt === ")" ||
                              chgtxt === "]"  ? ( [nix, _, act] = cflActive ? indexOfIndent(txt,pos,chgtxt)
                                                                            : [-1, -1, false]
                                                , nix >= 0 &&
                                                  act      ? editor.edit( eb => ( isFromKbd = false
                                                                                , eb.insert(pos.translate(0,1), " ")
                                                                                , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                ))
                                                                   .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                           : Promise.resolve()
                                                )
                                              : Promise.resolve()
                            ).catch(err => console.log(err))
                             .finally(_ => ( isFromKbd = true
                                           , _resolve()
                                           , console.log("here in change")
                                           ))
                          : ( _resolve()
                            , console.log("here in bypass")
                            )
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
