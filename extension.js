const vscode = require('vscode');
const DISPOSABLES = [];

class VirtualEditor {
  constructor(languageId = "javascript") {
    this.lines = [""];
    this.selection = new vscode.Selection(0, 0, 0, 0);
    this.languageId = languageId;
  }
  get document() {
    return { lineAt: n => ({ text: this.lines[n] || ""
                           , lineNumber: n
                           , isEmptyOrWhitespace: !/\S/.test(this.lines[n] || "")
                           })
           , getText: ({ start: s, end: e } = {}) => !s ? this.lines.join("\n")
                                                        : s.line === e.line ? (this.lines[ s.line] ?? "").substring(s.character, e.character)
                                                                            : [ (this.lines[ s.line] ?? "").substring(s.character)
                                                                              , ...this.lines.slice(s.line + 1, e.line)
                                                                              , (this.lines[ e.line] ?? "").substring(0, e.character)
                                                                              ].join( "\n")
           , get lineCount() { return this.lines.length; }
           , languageId: this.languageId
           };
  }
  
  edit(callback) {
    const edits = [];
    callback({ insert: (pos, val) => edits.push({ type: 'i', pos, val })
             , replace: (range, val) => edits.push({ type: 'r', range, val })
             , delete: (range) => edits.push({ type: 'd', range })
             });
    
    edits.sort((a, b) => {
                 const pA = a.pos || a.range.start,
                       pB = b.pos || b.range.start;
                 return pB.compareTo(pA);
              });

    for (const e of edits) {
      (e.type === 'i') ? this.#insert(e.pos, e.val)
                       :
      (e.type === 'r') ? this.#replace(e.range, e.val)
                       :
      (e.type === 'd') ? this.#replace(e.range, "")
                       : void 0;
    }
    return Promise.resolve(true);
  }

  #insert(pos, txt) {
    const l     = this.lines[pos.line] || "",
          pre   = l.substring(0, pos.character),
          post  = l.substring(pos.character),
          parts = txt.split("\n");
    parts.length === 1 ? ( this.lines[pos.line] = pre + txt + post
                         , this.selection = new vscode.Selection( pos.line
                                                                , pos.character + txt.length
                                                                , pos.line
                                                                , pos.character + txt.length
                                                                )
                         )
                       : ( this.lines[pos.line] = pre + parts[0]
                         , this.lines.splice( pos.line + 1
                                            , 0
                                            , ...parts.slice(1, -1)
                                            , parts[parts.length - 1] + post
                                            )
                         , this.selection = new vscode.Selection( pos.line + parts.length - 1
                                                                , parts[parts.length - 1].length
                                                                , pos.line + parts.length - 1
                                                                , parts[parts.length - 1].length
                                                                )
                         );
  }

  #replace(range, txt) {
    const s  = range.start, e = range.end,
          l1 = this.lines[s.line],
          l2 = this.lines[e.line];
    this.lines[s.line] = l1.substring(0, s.character) + l2.substring(e.character);
    (e.line > s.line) && this.lines.splice(s.line + 1, e.line - s.line);
    txt && this.#insert(s, txt);
  }
}

function activate(context) {
  const config  = vscode.workspace.getConfiguration("editor");
  let editor    = vscode.window.activeTextEditor,
      language  = editor?.document.languageId,
      freeToFix = true,
      cflActive = language === "javascript" || language === "typescript",
      difActive = cflActive,
      smcActive = cflActive,
      tefActive = cflActive;
  
  console.log(`"Wider" is now active for ${language} language!'`);
  DISPOSABLES.push( vscode.workspace.onDidChangeTextDocument(e => e.contentChanges.length &&
                                                                  e.reason === void 0     &&
                                                                  freeToFix               && fixOnType(e, editor)
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
                  , vscode.commands.registerTextEditorCommand( "wider.formatSelectedTernary"
                                                             , formatSelectedTernary
                                                             )
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

  function suppressIrrelevantCharacters(str){
    return str.replace( /\/(?:\\.|[^\\\/])+\/[gimuy]{0,5}|(['"`])(?:\\.|(?!\1)[\s\S])*?\1|(?<![:\/])\/\/.*$/gm
                      , match => "_".repeat(match.length)
                      );
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
    return !cnt ? /(?:\)\s*(?::.*?)?|try|=>)\s*\{$/.test(txt.substring(0,pch+1)) ? pos
                                                                                 : new vscode.Position(pln,pch)
                : pos;
  }

  function getPreviousMethodIndex(txt) {
    const match = txt.match(/\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
    return match ? match.index : -1;
  }
 
  function indexOfIndent(txt, pos, mod){
    const [UPSTR,DNSTR] = mod === "t" ? [":", "?"]
                                      :
                          mod === "." ? [")]", "(["]
                                      :
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
        blk = 0,
        tps,
        dix;

    while(cnt && pln >= 0){
      txt = suppressIrrelevantCharacters(txt);
      while(cnt && pch-- > 0){
        blk += txt[pch] === "}" ? 1
                                :
               txt[pch] === "{" ? -1
                                : 0;
        DNSTR.includes(txt[pch]) ? mod === "t" ? isTernaryQuestion(txt[pch-1], txt[pch], txt[pch+1]) ? ( tps = bypassObject(pos = new vscode.Position(pln, pch))
                                                                                                       , tps !== pos ? ( txt = suppressIrrelevantCharacters(editor.document.lineAt(tps.line).text)
                                                                                                                       , pln = tps.line
                                                                                                                       , pch = tps.character
                                                                                                                       )
                                                                                                                     : cnt--
                                                                                                       )
                                                                                                     : void 0
                                               : cnt--
                                 :
        UPSTR.includes(txt[pch]) ? mod === "t" ? ( pos = new vscode.Position(pln,pch)
                                                 , tps = pos
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
      !blk                            && 
      cnt                             && 
      (mod === void 0 || mod === ";") && ( dix = txt.search(/(?<=\b(?:let|var|const)\s+)[\w\$](?!.*(?<=\b(?:let|var|const)\s+)[\w\$])/)
                                         , dix >= 0 && (cnt = 0)
                                         );
      cnt && pln-- && ( txt = editor.document.lineAt(pln).text
                      , pch = txt.length
                      );
    }
    return !cnt ? mod === "." ? /[\])]$/.test(txt.slice(0,pch)) ? indexOfIndent(txt.slice(0,pch+1), new vscode.Position(pln,pch-1), ".")
                                                                : [getPreviousMethodIndex(txt.slice(0,pch)), false, false]
                              :
                  mod === ";" ? dix >= 0 ? [-1, new vscode.Position(pln,dix), false]
                                         : [-1, false, false]
                              : 
                  dix >= 0    ? [-1, new vscode.Position(pln,dix), false]
                              : [pch, false, txt[pch+1] === " "]
                : [-1, false, false];
  }

  function isDontCare(txt, pos){
    const mcs = [...txt.matchAll(/\/(?:\\.|[^\\\/])+\/[gimuy]{0,5}|(['"`])(?:\\.|(?!\1)[\s\S])*?\1|(?<![:\/])\/\/.*$/gm)];
    return mcs.some(m => pos.character > m.index && pos.character < m.index + m[0].length);
  }

  function isDeletion(chg){
    return chg.text === "" && chg.rangeLength > 0;
  }

  function isEmptyBetweenBrackets(txt, pos, openChar) {
    const str = txt.slice(0, pos).trimEnd();
    return str.endsWith(openChar) ? str.length : -1;
  }

  function isTernaryQuestion(p, c, n) {
  return c === "?" && p !== "?" && n !== "?" && n !== ".";
  }

  function isTernaryColon(pos){
    let pln   = pos.line,
        pch   = pos.character,
        depth = 0,
        done  = false,
        val,
        txt,
        bps;

    while(pln >= 0 && !done){
      txt = suppressIrrelevantCharacters(editor.document.lineAt(pln).text);

      while(pch >= 0 && !done) {
        txt[pch] === "}" ? ( bps = bypassObject(new vscode.Position(pln, pch))
                           , !bps.isEqual(new vscode.Position(pln, pch)) && ( pln = bps.line
                                                                            , pch = bps.character
                                                                            , txt = suppressIrrelevantCharacters(editor.document.lineAt(pln).text)
                                                                            )
                           )
                         :
        txt[pch] === "{" ? !/(?:\)|try|=>)\s*$/.test(txt.substring(0, pch)) && ( done = true
                                                                               , val = false
                                                                               )
                         :
        txt[pch] === ":" ? depth++
                         :
        txt[pch] === "?" ? isTernaryQuestion(txt[pch-1], txt[pch], txt[pch+1]) && ( depth--
                                                                                  , !depth && ( done = true
                                                                                              , val = new vscode.Position(pln, pch)
                                                                                              )
                                                                                  )
                         : void 0;
        pch--;
      }
      !done && ( pln--
               , pln >= 0 && ( txt = suppressIrrelevantCharacters(editor.document.lineAt(pln).text)
                             , pch = txt.length - 1
                             )
               );
    }
    return done ? val
                : false;
  }

  function moveCursorTo(lin, chr){
    const pos = new vscode.Position(lin, chr);
    editor.selection = new vscode.Selection(pos, pos);
    return pos;
  }

  function alignDeclaration(dps, pos, lst){
    let lvi;
    const sel = new vscode.Selection(dps.translate(0,-dps.character),pos.translate(0,1));
    const lns = editor.document.getText(sel)
                               .split(/\n+/);
    const ixs = lns.map(l => l.search(/(?<=(?:let\s+|var\s+|const\s+|^\s*)\${0,1}[a-zA-Z\d\-_]+\s*)=/));
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
                                                      .text.search(/\b(?:let|var|const)\b/)
                               , lvi > 0 ? " ".repeat(lvi)
                                         : ""
                               )
                             : " ".repeat(dps.character));
    return editor.edit(eb => ( freeToFix = false
                             , eb.replace(sel,txt)
                             ));
  }
  
  function formatSelection(realEditor, delimiters) {
    const sel = realEditor.selection;
    const rawTxt = realEditor.document.getText(sel).replace(/(?<![:\/])\/\/.*$/gm, "");
    const spp = new vscode.Position(sel.start.line, sel.start.character + rawTxt.match(/^\s*/)[0].length);
    const _sl = new vscode.Selection( new vscode.Position(sel.start.line, 0), spp);
    const s_l = new vscode.Selection(spp, sel.end);
    const sl_ = new vscode.Selection(sel.end, new vscode.Position(sel.end.line, Number.MAX_VALUE));
    const headTxt = realEditor.document.getText(_sl);
    const tailTxt = realEditor.document.getText(sl_);
    const sup = suppressIrrelevantCharacters(rawTxt);
    
    const acc = rawTxt.split("")
                      .reduce( (d, c, i) => sup[i] === "\n" ? d
                                                            : 
                                     "{[(".includes(sup[i]) ? ( d[1] && d[0].push(d[1].trim())
                                                              , d[0][d[0].length - 1]?.match(/[=:,)]$/) && (d[0][d[0].length - 1] += " ")
                                                              , d[0].push(c + " ")
                                                              , d[1] = ""
                                                              , d
                                                              )
                                                            :
                                delimiters.includes(sup[i]) ? ( isTernaryQuestion(sup[i-1], sup[i], sup[i+1]) ? ( d[1] && d[0].push(d[1].trim() + " ")
                                                                                                                , d[0].push(c + " ")
                                                                                                                )
                                                                                                              : ( d[1] && d[0].push(d[1].trim())
                                                                                                                , d[0].push(c)
                                                                                                                )
                                                              , d[1] = ""
                                                              , d
                                                              )
                                                            : ( d[1] += c
                                                              , d
                                                              )
                             , [[], ""]
                             );
    acc[1] && acc[0].push(acc[1].trim());
    
    const tokens = acc[0];
    const vEditor = new VirtualEditor(realEditor.document.languageId);

    return tokens.reduce( (p, t) => p.then(_ => vEditor.edit(eb => eb.insert(vEditor.selection.active, t)))
                                     .then(_ => {
                                             const cp = vEditor.selection.active;
                                             const ch = t.trim()
                                                         .slice(-1);
                                             return cp.character > 0         &&
                                                    ch !== ""                &&
                                                    ",;{}[]()?:".includes(ch) ? fixOnType( { document: vEditor.document
                                                                                           , contentChanges: [{ text: ch
                                                                                                              , range: new vscode.Range( cp.translate(0,-1)
                                                                                                                                       , cp
                                                                                                                                       )
                                                                                                              , rangeLength: 0
                                                                                                              }] 
                                                                                           }
                                                                                         , vEditor
                                                                                         )
                                                                              : Promise.resolve()
                                           })
                        , vEditor.edit(eb => eb.insert(new vscode.Position(0, 0), headTxt))
                        )
                 .then(_ => vEditor.edit(eb => eb.insert(vEditor.selection.active, tailTxt)))
                 .then(_ => realEditor.edit(eb => eb.replace( [_sl,s_l,sl_].reduce((p,c) => p.union(c))
                                                            , vEditor.lines.join("\n")
                                                            )))
                 .then(_ => {
                         const finalLines = vEditor.lines,
                               endLine    = s_l.start.line + finalLines.length - 1,
                               endChar    = finalLines[finalLines.length - 1].length,
                               newPos     = new vscode.Position(endLine, endChar);
                         realEditor.selection = new vscode.Selection(newPos, newPos);
                       })
                 .catch(err => console.error("CommaFirst Logic Error:", err));
  }

  function commaFirstSelection(realEditor) {
    return formatSelection(realEditor, "}]),;");
  }

  function formatSelectedTernary(realEditor) {
    return formatSelection(realEditor, "}]),;?:");
  }

  function fixOnType(event, currentEditor) {
    const prevEd = editor;
    editor = currentEditor;
    const change = event.contentChanges[0];
    const chgtxt = change?.text;
    const pairof = { "}": "{"
                   , "]": "["
                   , ")": "("
                   };
    const pos    = change.range.start;
    const txt    = event.document.lineAt(pos.line).text;
    const pix    = pos.character;
    let act = true,
        nix = -1,
        ofs = -1,
        dps;

    return !isDontCare(txt, pos) &&
           !isDeletion(change)   ? ( chgtxt === ":" &&
                                     tefActive       ? ( nix = isTernaryColon(pos)?.character ?? -1
                                                       , nix >= 0 ? editor.edit(eb => ( freeToFix = false
                                                                                      , eb.replace( new vscode.Range(pos,pos.translate(0,1))
                                                                                                  , "\n" + " ".repeat(nix) + ": "
                                                                                                  )
                                                                                      ))
                                                                  : Promise.resolve()
                                                       )
                                                     :
                           chgtxt === "?"           &&
                           tefActive                &&
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
                                                                                             : editor.edit(eb => ( freeToFix = false
                                                                                                                 , eb.insert(pos.translate(0,1), " ")
                                                                                                                 , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                                 ))
                                                                                                     .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                                  :
                                                          dps     ? alignDeclaration(dps, pos, false)
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
                                                ")]".includes(txt[pix-1]) ? ( nix = indexOfIndent(txt, pos.translate(0,-1), ".")[0]
                                                                            , nix >= 0 && editor.edit(eb => ( freeToFix = false
                                                                                                            , eb.insert(pos, "\n" + " ".repeat(nix))
                                                                                                            ))
                                                                            )
                                                                          : Promise.resolve()
                                                     :
                                     chgtxt === "{}" ? ( nix = difActive ? txt.slice(0,pos.character)
                                                                              .search(/\bclass(?:\s+\${0,1}[\w\-]+\s*)*$|function(?:\s+\${0,1}[\w\-]+\s*)*\(.*?\)|(?<!(?:function|=>).*)(?:(?<=\s+)[\$\[]{0,1}[\w\-\]]+\s*\([^\(]*\)(?!.*[\(\.\,]))(?!.*(?:function|=>))|try\s*$|\(?\S*\)?(?=\s*=>\s*$)/)
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
                                     chgtxt === "]"  ? ( nix = isEmptyBetweenBrackets(txt, pos.character, pairof[chgtxt])
                                                       , nix >= 0 ? ( freeToFix = false
                                                                    , editor.edit(eb => eb.delete(new vscode.Range( new vscode.Position(pos.line, nix)
                                                                                                                  , new vscode.Position(pos.line, pos.character)
                                                                                                                  )))
                                                                            .then( _ => moveCursorTo(pos.line, nix + 1))
                                                                    )
                                                                  : ( [nix,, act] = cflActive ? indexOfIndent(txt, pos, chgtxt)
                                                                                              : [-1, -1, false]
                                                                    , nix >= 0                    &&
                                                                      act                         &&
                                                                      txt[ nix] !== pairof[chgtxt] ? ( freeToFix = false
                                                                                                     , editor.edit(eb => eb.insert(pos, "\n" + " ".repeat( nix)))
                                                                                                             .then(_ => moveCursorTo(pos.line + 1, nix + 1))
                                                                                                     )
                                                                                                   : Promise.resolve()
                                                                    )
                                                       )
                                                     : Promise.resolve()
                                    )
                                    .catch(err => console.log(err))
                                    .finally(_ => ( freeToFix = true
                                                  , editor = prevEd
                                                  ))
                                 : Promise.resolve()
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