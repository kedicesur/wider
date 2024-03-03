const vscode = require('vscode');
const DISPOSABLES = [];

Array.prototype.log = function(...ps){
                        ps.length && console.log(`Parameters Log: ${ps.reduce((p,c) => p.toString() + " - " + c.toString())}`);
                        this.forEach((e,i) => console.log(`Item ${i}: ${e}`));
                        return this;
                      }

function activate(context) {
  const config  = vscode.workspace.getConfiguration("editor");
  let editor    = vscode.window.activeTextEditor,
      language  = editor?.document.languageId,
      freeToFix = true,
      cflActive = language === "javascript" || language === "typescript",
      difActive = cflActive,
      smcActive = cflActive,
      tefActive = cflActive,
      _resolve,
      fixNext   = new Promise(resolve => _resolve = resolve);
  
  console.log(`"Wider" is now active for ${language} language!'`);
  DISPOSABLES.push( vscode.workspace.onDidChangeTextDocument(e => e.contentChanges.length &&
                                                                  e.reason === void 0     &&              // not UNDO (1) or REDO (2)
                                                                  freeToFix               && fixOnType(e) // see https://github.com/microsoft/vscode/issues/204018
                                                            )
                  , vscode.workspace.onDidChangeConfiguration(e => e && updateActivators())
                  , vscode.window.onDidChangeActiveTextEditor(e => e && ( editor = e
                                                                        , language = e.document.languageId
                                                                        , updateActivators()
                                                                        , console.log(`"Wider" switched to ${language} language!`)
                                                                        ))
                  , vscode.commands.registerTextEditorCommand( "wider.commaFirstSelection"
                                                             , commaFirstSelection
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
    return str.replace( /\/(?:\\.|[^\\\/])+\/[gimuy]{0,5}|(['\"`])((?:\\.|[^\\\1])*?)\1|(?<![:\/])\/\/.*$/gm // Suppresses the regexp, string literal \/(?:\\.|[^\\\/])+(?:\/[gimuy]{0,5})
                      , match => "_".repeat(match.length)                                                    // and comment parts of the given string
                      );                                                                                     // with "_" character in the same length
  }

  function offsetOfRightPair(txt, pos){
    const str = suppressIrrelevantCharacters(txt.substring(pos.character));
    const [DNSTR,UPSTR] = [")}]", "({["];
    let cnt = 1,
        cix = 0;
    
    while(cnt && ++cix < str.length){
      DNSTR.includes(str[cix]) ? cnt--
                               :
      UPSTR.includes(str[cix]) ? cnt++
                               : void 0;
    }
    return cnt ? -1
               : cix;
  }

  function bypassObject(pos){
    const [UPSTR,DNSTR] = ["}", "{"];
    let pln = pos.line,
        pch = pos.character,
        cnt = 1,
        txt = editor.document.lineAt(pln).text.substring(0,pch);

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
    }
    return !cnt ? /\)\s*\{/.test(txt.substring(0,pch+1)) ? pos
                                                         : new vscode.Position(pln,pch)
                : pos;
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
                                      :
                          mod === ";" ? [";", ";"]
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
                                                 , tps !== pos ? ( txt = suppressIrrelevantCharacters(editor.document.lineAt(tps.line)
                                                                                                                     .text)
                                                                 , pln = tps.line
                                                                 , pch = tps.character
                                                                 )
                                                               : cnt--
                                                 )
                                               : cnt--
                                 :
        UPSTR.includes(txt[pch]) ? mod === "t" ? ( tps = bypassObject(pos = new vscode.Position(pln,pch))
                                                 , tps !== pos ? ( txt = suppressIrrelevantCharacters(editor.document.lineAt(tps.line)
                                                                                                                     .text)
                                                                 , pln = tps.line
                                                                 , pch = tps.character
                                                                 )
                                                               : cnt++
                                                 )
                                               : cnt++
                                 : void 0;
      }
      cnt && ( dix = txt.search(/(?<=\b(let|var)\s+)[\w\$](?!.*\blet\b|.*\bvar\b)/)  // get the index of variable name after last "let" or "var" on line
             , dix >= 0 && (cnt = 0)
             );
      cnt && pln-- && ( txt = editor.document.lineAt(pln).text
                      , pch = txt.length
                      );
    }
    return !cnt ? mod === "." ? ( dix = txt.lastIndexOf(".", pch)                    // get the index of dot "." of the last method before matching left paranthesis
                                , txt.substring(dix,pch)                             // normally this is the method name but if the matching left paren belongs to
                                     .search(/\(/) >= 0 ||                           // an expression sequenced code block in a callback that returns a promise etc
                                  dix === -1            ? [pch, false, false]        // and we like to chain to it with a ".then" this test prevents it to catch the
                                                        : [dix, false, false]        // dot at dix index and uses the matching left paranthesis index instead.
                                )
                              :
                  mod === ";" ? dix >= 0 ? [-1, new vscode.Position(pln,dix), false]
                                         : [-1, false, false]
                              : 
                  dix >= 0    ? [-1, new vscode.Position(pln,dix), false]
                              : [pch, false, txt[pch+1] === " "]
                : [-1, false, false];
  }

  function isDontCare(txt, pos){
    const mcs = [...txt.matchAll(/\/(?:\\.|[^\\\/])+\/[gimuy]{0,5}|(['\"`])((?:\\.|[^\\\1])*?)\1|(?<![:\/])\/\/.*$/gm)];
    return mcs.some(m => pos.character > m.index && pos.character < m.index + m[0].length);
  }

  function isDeletion(chg){
    return chg.text === "" && chg.rangeLength > 0;
  }

  function moveCursorTo(lin, chr){
    const pos = new vscode.Position(lin, chr);
    editor.selection = new vscode.Selection(pos, pos);
    return pos;
  }

  // Formatting functions

  function alignDeclaration(dps, pos, lst){
    let lvi;  // indeex of let or var
    const sel = new vscode.Selection(dps.translate(0,-dps.character),pos.translate(0,1));
    const lns = editor.document.getText(sel)
                               .split(/\n+/);
    const ixs = lns.map(l => l.search(/(?<=(?:let\s+|var\s+|^\s*)\${0,1}[a-zA-Z\d\-_]+\s*)=/));
    const max = Math.max(...ixs);
    const txt = lns.reduce( (s,l,i) => ( ixs[i] >= 0 ? s.l += l.substring(0,ixs[i]) + " ".repeat(s.d = max - ixs[i]) + l.substring(ixs[i]) + "\n"
                                                     : s.l += " ".repeat(s.d) + l + "\n"
                                       , s
                                       )
                          , { l: ""
                            , d: 0
                            }
                          )
                   .l + (lst ? ( lvi = editor.document.lineAt(dps.line)
                                                      .text.search(/\b(?:let|var)\b/)
                               , lvi > 0 ? " ".repeat(lvi)
                                         : ""
                               )
                             : " ".repeat(dps.character));
    return editor.edit(eb => ( freeToFix = false
                             , eb.replace(sel,txt)
                             ));
  }

  function commaFirstSelection(editor){
    const sel = editor.selection;
    const sl_ = new vscode.Selection(sel.end, new vscode.Position(sel.end.line, Infinity));
    const txt = editor.document.getText(sel)
                               .replace(/(?<![:\/])\/\/.*$/gm,"");
    const tx_ = editor.document.getText(sl_);
    const sup = suppressIrrelevantCharacters(txt);
    let pos = sel.start;
    
    txt.split("")
       .reduce( (d,c,i) => ( "{[(".includes(sup[i]) ? ( d[1].length && (d[1][d[1].length-1] = d[1][d[1].length-1].trimStart())
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
                             sup[i] === ","         ||
                             sup[i] === ";"         ? ( d[1].length && ( d[1][d[1].length-1] = d[1][d[1].length-1].trim()
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
              )
       .reduce((p,c) => p.concat(c))
       .reduce( (p,s) => s !== "" ? p.then(_ => ( fixNext = new Promise(resolve => _resolve = resolve)
                                                , editor.edit(eb => eb.insert(pos,s))
                                                , fixNext
                                                ))
                                     .then(_ => pos = editor.selection.active.translate(0, s.length+1))
                                  : p
              , editor.edit(eb => eb.replace(sel.union(sl_), ""))
              )
       .then(_ => editor.edit(eb => eb.insert(pos,tx_)));
       //.then(_ => moveCursorTo(sel.end.line,sel.end.character));
  }

  function fixOnType(event) {
    const change = event.contentChanges[0];
    const chgtxt = change?.text;
    const pairof = { "}": "{"
                   , "]": "["
                   , ")": "("
                   };
    const pos    = change.range.start;                   // position of the cursor in the editor
    const pix    = pos.character;                        // current index of the cursor
    const txt    = event.document.lineAt(pos.line).text; // text of the current line
    let act = true,                                      // comma-first activator carried from indexOfIndent()
        nix = -1,                                        // next indent index
        ofs = -1;                                        // offset of the right matching pair "})]"

    !isDontCare(txt, pos) &&
    !isDeletion(change)   ? ( chgtxt === ":"  ? tefActive                &&
                                                pos === bypassObject(pos) ? ( nix = indexOfIndent(txt, pos, "t")[0]
                                                                            , nix >= 0 ? editor.edit(eb => ( freeToFix = false
                                                                                                           , eb.replace( new vscode.Range(pos,pos.translate(0,1))
                                                                                                                       , "\n" + " ".repeat(nix) + ": "
                                                                                                                       )
                                                                                                           ))
                                                                                       : Promise.resolve()
                                                                            )
                                                                          : Promise.resolve()
                                              :
                              chgtxt === "?"  ? tefActive                &&
                                                txt[pix-1] === " "       &&
                                                pos === bypassObject(pos) ? ( nix = suppressIrrelevantCharacters(txt).lastIndexOf(":", pix)
                                                                            , nix >= 0 ? editor.edit(eb => ( freeToFix = false
                                                                                                           , eb.insert( pos.translate(0, 1)
                                                                                                                      , " "
                                                                                                                      )
                                                                                                           , eb.insert( pos.translate(0, nix-pix+1)
                                                                                                                      , "\n" + (pix < 2*nix+1 ? " ".repeat(2*nix+1-pix) : "")
                                                                                                                      )
                                                                                                           ))
                                                                                       : Promise.resolve()
                                                                            )
                                                                          : Promise.resolve()
                                              :
                              chgtxt === ","  ? ( [nix, dps, act] = cflActive ? indexOfIndent(txt,pos)
                                                                              : [-1, -1, false]
                                                , nix >= 0 &&
                                                  act      ? "{([".includes(txt[nix]) ? editor.edit(eb => ( freeToFix = false
                                                                                                          , eb.insert(pos.translate(0, 1), " ")
                                                                                                          , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                          , ofs = offsetOfRightPair(txt,pos)
                                                                                                          , ofs >= 0 && eb.insert( pos.translate(0, ofs)
                                                                                                                                 , "\n" + " ".repeat(nix)
                                                                                                                                 )
                                                                                                          ))
                                                                                              .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                                                      : editor.edit( eb => ( freeToFix = false
                                                                                                           , eb.insert(pos.translate(0,1), " ")
                                                                                                           , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                           ))
                                                                                              .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                           :
                                                  dps      ? alignDeclaration(dps, pos, false)
                                                           : Promise.resolve()
                                                )
                                              :
                              chgtxt === ";"  ? ( dps = cflActive ? indexOfIndent(txt,pos,";")[1]
                                                                  : false
                                                , dps ? alignDeclaration(dps, pos, true)
                                                      : Promise.resolve()
                                                )
                                              :
                              chgtxt === "."  ? smcActive          &&
                                                txt[pix-1] === ")" ? ( nix = indexOfIndent(txt, pos.translate(0,-1), ".")[0]
                                                                     , nix >= 0 && editor.edit(( freeToFix = false
                                                                                               , eb => eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                               ))
                                                                     )
                                                                   : Promise.resolve()
                                              :
                              chgtxt === "{}" ? ( nix = difActive ? txt.search(/function.*\(/)
                                                                  : -1
                                                , nix >= 0 ? editor.edit(eb => ( freeToFix = false
                                                                               , eb.insert( pos.translate(0,1)
                                                                                          , "\n" + " ".repeat(nix + 2) + "\n" + " ".repeat(nix)
                                                                                          )
                                                                               ))
                                                                   .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                           : Promise.resolve()
                                                )
                                              :
                              chgtxt === "}" ||
                              chgtxt === ")" ||
                              chgtxt === "]"  ? ( [nix,, act] = cflActive ? indexOfIndent(txt,pos,chgtxt)
                                                                          : [-1, -1, false]
                                                , nix >= 0                   &&
                                                  act                        &&
                                                  txt[nix] !== pairof[chgtxt] ? editor.edit( eb => ( freeToFix = false
                                                                                                   , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                   ))
                                                                                      .then(_ => moveCursorTo(pos.line + 1, nix + 1))
                                                                              : Promise.resolve()
                                                )
                                              : Promise.resolve()
                            ).catch(err => console.log(err))
                             .finally(_ => ( freeToFix = true
                                           , _resolve()
                                           ))
                          : _resolve()
  }

  config.update("formatOnType", false, vscode.ConfigurationTarget.Global);
  config.update("autoClosingBrackets", "always", vscode.ConfigurationTarget.Global);
  DISPOSABLES.length && context.subscriptions.push(...DISPOSABLES);
}

function deactivate(){
  DISPOSABLES.forEach(disposable => disposable.dispose());
}

module.exports = {
  activate,
  deactivate
};
