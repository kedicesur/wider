const vscode = require('vscode');
const DISPOSABLES = [];

//Define Robust Virtual Editor
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
  // VSCode-compliant Edit: Atomic application
  edit(callback) {
    const edits = [];
    callback({ insert: (pos, val) => edits.push({ type: 'i', pos, val })
             , replace: (range, val) => edits.push({ type: 'r', range, val })
             , delete: (range) => edits.push({ type: 'd', range })
             });
    
    // Sort edits reverse-positional (Right-to-Left, Bottom-to-Top) to prevent index drift
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
    // Delete then Insert
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
      cflActive = language === "javascript" || language === "typescript", // comma first layout
      difActive = cflActive,                                              // deep indented functions
      smcActive = cflActive,                                              // stacked method chaining  
      tefActive = cflActive;                                              // ternary formatting
  
  console.log(`"Wider" is now active for ${language} language!'`);
  DISPOSABLES.push( vscode.workspace.onDidChangeTextDocument(e => e.contentChanges.length &&
                                                                  e.reason === void 0     &&              // not UNDO (1) or REDO (2)
                                                                  freeToFix               && fixOnType(e, editor) // see https://github.com/microsoft/vscode/issues/204018
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
    return str.replace( /(?<=[\s\(\[\{,;:=!&|?^\/])\/(?![ \t]+[\da-zA-Z_$])(?:\\.|[^\\\/\n])+\/[gimuy]{0,5}|(['"`])(?:\\.|(?!\1)[\s\S])*?\1|(?<![:\/])\/\/.*$/gm
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
    return !cnt ? /(?:\)\s*(?::.*?)?|try|=>)\s*\{$/.test(txt.substring(0,pch+1)) ? pos // regex includes ) followed by a TS type annotation or not, => or try before { so not an object literal
                                                                                 : new vscode.Position(pln,pch)
                : pos;
  }

  function getPreviousMethodIndex(txt) {
    
    // Match: .methodName at the end of the string
    // Allows optional chaining (?.foo) because we match the dot before foo
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
        dix,
        nix;

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
                                               : (mod !== ";" || blk === 0) && cnt--
                                 :
        UPSTR.includes(txt[pch]) ? mod === "t" ? ( pos = new vscode.Position(pln,pch)
                                                 , tps = pos // bypassObject(pos = new vscode.Position(pln,pch))
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
                                                                : ( nix = getPreviousMethodIndex(txt.slice(0,pch)) // send the slice of the line text coming before "(" to get previous method's index or -1
                                                                  , [ nix
                                                                    , false
                                                                    , false
                                                                    , nix >= 0 ? txt.slice(0,nix).replace( /[^\t]/g, " ")
                                                                               : "" // keep tabs so the indent renders at the dot's column for any tab size
                                                                    ]
                                                                  )
                              :
                  mod === ";" ? dix >= 0 ? [-1, new vscode.Position(pln,dix), false]
                                         : [-1, false, false]
                              : 
                  dix >= 0    ? [-1, new vscode.Position(pln,dix), false]
                              : [ pch
                                , false
                                , txt[ pch+1]=== " "
                                , txt.slice(0, pch).replace( /[^\t]/g, " ") // keep tabs so the indent renders at the opener's column for any tab size
                                ]
                : [-1, false, false];
  }

  function isDontCare(txt, pos){
    const sup = suppressIrrelevantCharacters(txt);
    return sup[pos.character] === "_" && txt[pos.character] !== "_";
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
        pch   = pos.character,  // Start at the colon position
        depth = 0,
        done  = false,
        val,
        txt,
        bps;
    
      // Start at 0, will become 1 when we hit the typed colon

    while(pln >= 0 && !done){
      txt = suppressIrrelevantCharacters(editor.document.lineAt(pln).text);
      
      // On the starting line, we want to include the colon at pos.character in our search
      // On subsequent lines, we search the entire line from the end
      while(pch >= 0 && !done) {
        txt[pch] === "}" ? ( bps = bypassObject(new vscode.Position(pln, pch))
                           , !bps.isEqual(new vscode.Position(pln, pch)) && ( pln = bps.line
                                                                            , pch = bps.character
                                                                            , txt = suppressIrrelevantCharacters(editor.document.lineAt(pln).text)
                                                                            )
                           )
                         :
        txt[pch] === "{" ? !/(?:\)|try|=>)\s*$/.test(txt.substring(0, pch)) && ( done = true  // If NOT preceded by =>, ), or try then "{" is not a block start but an object literal opener.
                                                                               , val = false  // So colon can not belong to a ternary. Do not keep scanning backwards
                                                                               )
                         :
        txt[pch] === ":" ? depth++ // Nested colon found (includes the one we just typed on first iteration)
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

  // Formatting functions

  function alignDeclaration(dps, pos, lst){ // THIS NEEDS TO BE FIXED AS DECLARATIONS IN FUNCTION DECLARATIONS EFFECT THE INDENTING
    let lvi;
    const sel     = new vscode.Selection(dps.translate(0,-dps.character),pos.translate(0,1)),
          lns     = editor.document.getText(sel)
                                   .split(/\n+/),
          pattern = /(?<=(?:let\s+|var\s+|const\s+|^\s*)\${0,1}[a-zA-Z\d\-_]+\s*)=/,
          src     = lns.join("\n"),
          sup     = suppressIrrelevantCharacters(src),
          ixs     = lns.map(l => l.search(pattern));
    let baseDepth;
    const stack = [],
          closeFor = { ")": "(", "]": "[", "}": "{" };

    for (let i = 0, offset = 0, line = 0; i < src.length; i++) {
      if (i === dps.character) baseDepth = stack.length;
      const ix = ixs[line];
      if (ix >= 0) {
        const eq = offset + lns[line].indexOf("=", ix);
        if (i === eq && (stack.length !== baseDepth || sup[i] !== "=")) ixs[line] = -1;
      }
      if (i === offset + lns[line].length) {
        offset += lns[line].length + 1;
        line++;
      }
      const ch = sup[i];
      if ("([{".includes(ch)) stack.push(ch);
      else if (closeFor[ch] && stack[stack.length - 1] === closeFor[ch]) stack.pop();
    }
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

  function indexOfComment(txt) {
    let q = "";
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (q) {
        ch === "\\" ? i++
                    : ch === q && (q = "");
      }
      else if (ch === '"' || ch === "'" || ch === "`") q = ch;
      else if (ch === "/" && txt[i+1] === "/") return i;
    }
    return -1;
  }

  // Replaces comments with spaces so that character offsets match the original text
  function extractComments(txt) {
    const comments = [],
          raw      = [];
    let offset = 0;

    for (const line of txt.split("\n")) {
      const ix = indexOfComment(line);
      ix < 0 ? raw.push(line)
             : ( comments.push({ offset: offset + ix
                               , text: line.slice(ix).trim()
                               , standalone: line.slice(0, ix).trim() === ""
                               })
               , raw.push(line.slice(0, ix) + " ".repeat(line.length - ix))
               );
      offset += line.length + 1;
    }
    return { rawTxt: raw.join("\n"), comments };
  }

  // Comments are re-attached by the count of non-whitespace characters preceding them,
  // which the formatter preserves, rather than by the text of a neighbouring line.
  function reattachComments(lines, rawTxt, comments, headCount) {
    if (!comments.length) return lines;

    const text    = lines.join("\n"),
          norm    = [],
          edits   = [],
          inlines = [],
          groups  = [];

    for (let i = 0; i < text.length; i++) /\S/.test(text[i]) && norm.push(i);

    const lstart                    = i => text.lastIndexOf("\n", i - 1) + 1,
          lend                      = i => {
                     const j        = text.indexOf("\n", i);
                            return j < 0 ? text.length
                                         : j;
                          },
          nextNw                    = i => {
                                        while (i < text.length && !/\S/.test(text[i])) i++;
                                        return i;
                                     },
          leadWs                    = i => text.slice(lstart(i), i).match(/^\s*/)[0],
                             // column of the bracket matching the closing bracket at i
          openerCol                 = i => {
                        const close = text[i],
                              open  = { "}": "{", "]": "[", ")": "(" }[close];
                        if (!open) return -1;
                        for (let d  = 0, j = i; j >= 0; j--) {
                           if (text[j] === close) d++;
                           else if (text[j] === open && --d === 0) return j - lstart(j);
                         }
                         return -1;
                       },
           // indent for code that follows a comment inserted into the middle of a line
          contInd                   = (at, nxt) => "}])".includes(text[nxt]) && openerCol(nxt) >= 0 ? " ".repeat(openerCol(nxt))
                                                                                                    : " ".repeat(nxt - lstart(at));
    

    let cix = 0,
        cnt = 0;
    for (let i = 0; i < rawTxt.length && cix < comments.length; i++) {
      while (cix < comments.length && comments[cix].offset <= i) comments[cix++].count = cnt;
      /\S/.test(rawTxt[i]) && cnt++;
    }
    while (cix < comments.length) comments[cix++].count = cnt;

    const addGroup = (at, to, ind, pre, post, txt) => {
      const grp = groups[groups.length - 1];
      grp && grp.at === at &&
      grp.to === to        &&
      grp.ind === ind      &&
      grp.pre === pre      &&
      grp.post === post     ? grp.texts.push(txt) 
                            : groups.push({ at, to, ind, pre, post, texts: [txt] });
    };

    for (const c of comments) {
      const idx  = Math.min(c.count + headCount, norm.length) - 1,
            last = idx >= 0 ? norm[idx] : -1;

      if (c.standalone) {
        const at  = last + 1,
              nxt = nextNw(at);

        nxt === text.length ? addGroup( at, at, leadWs(at)
                                      , at > 0 && text[at-1] !== "\n" ? "\n" : "", ""
                                      , c.text
                                      )
                            :
        nxt > lend(at)      ? addGroup( lstart(nxt), lstart(nxt), text.slice(lstart(nxt), nxt)
                                      , "", "\n"
                                      , c.text
                                      )
                            : addGroup( at, nxt
                                      , at === lstart(at) ? text.slice(at, nxt) : contInd(at, nxt)
                                      , at === lstart(at) ? "" : "\n"
                                      , "\n" + (at === lstart(at) ? text.slice(at, nxt) : contInd(at, nxt))
                                      , c.text
                                      );
      }
      else {
        let at = last + 1;
        // A trailing comma/semicolon moved to the next line must stay after the comment
        if (last >= 0 && ",;".includes(text[last]) && /^\s*$/.test(text.slice(lstart(last), last))) {
          let p = last - 1;
          while (p >= 0 && /\s/.test(text[p])) p--;
          at = p + 1;
        }
        const nxt = nextNw(at),
              add = nxt < text.length && nxt <= lend(at);
        inlines.push({ at, to: add ? nxt : at
                     , base: " " + c.text
                     , text: " " + c.text + (add ? "\n" + contInd(at, nxt) : "")
                     });
      }
    }

    groups.forEach(g => edits.push({ at: g.at
                                   , to: g.to
                                   , pre: g.pre
                                   , text: g.pre + g.texts.map(t => g.ind + t).join("\n") + g.post
                                   }));

    // An inline comment and a standalone comment may share the same insertion point
    inlines.forEach(e => {
                      const grp = edits.find(g => g.pre !== void 0 && g.at === e.at && g.to === e.to);
                      grp ? grp.text = e.base + "\n" + grp.text.slice(grp.pre.length)
                          : edits.push(e);
                    });

    let out = text;
    edits.sort((a,b) => b.at - a.at || b.to - a.to)
         .forEach(e => out = out.slice(0, e.at) + e.text + out.slice(e.to));
    return out.split("\n");
  }

  // Unified helper function for formatting selected text for comma first and ternary
  function formatSelection(realEditor, delimiters) {
    // 1. Setup Selection and Context (Same as original)
    const sel = realEditor.selection;
    const fullTxt = realEditor.document.getText(sel);
    const spp = new vscode.Position(sel.start.line, sel.start.character + fullTxt.match(/^\s*/)[0].length); // split position between _sl and s_l
    const _sl = new vscode.Selection( new vscode.Position(sel.start.line, 0), spp);                        // head selection including leading white spaces
    const s_l = new vscode.Selection(spp, sel.end);                                                        // tail selection including last line after s_l 
    const sl_ = new vscode.Selection(sel.end, new vscode.Position(sel.end.line, Number.MAX_VALUE));
    const headTxt = realEditor.document.getText(_sl);
    const tailTxt = realEditor.document.getText(sl_);

    const { rawTxt, comments } = extractComments(fullTxt);
    const sup = suppressIrrelevantCharacters(rawTxt);

    // 2. Tokenize (Mofied and Simplified)
    const acc = rawTxt.split("")
                      .reduce( (d, c, i) => sup[i] === "\n" ? d
                                                            : 
                                     "{[(".includes(sup[i]) ? ( d[1] && d[0].push(d[1].trim())
                                                              , d[0][d[0].length - 1]?.match(/[=:,)]$/) && (d[0][d[0].length - 1] += " ") // insert space if needed
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

    // 3. Run Process in Isolation
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
                 .then(_ => {
                         const finalLines = reattachComments(vEditor.lines, rawTxt, comments, headTxt.replace(/\s/g, "").length),
                               endLine    = s_l.start.line + finalLines.length - 1,
                               endChar    = finalLines[finalLines.length - 1].length,
                               newPos     = new vscode.Position(endLine, endChar);
                         return realEditor.edit(eb => eb.replace( [_sl,s_l,sl_].reduce((p,c) => p.union(c))
                                                                , finalLines.join("\n")
                                                                ))
                                          .then(_ => {
                                                  realEditor.selection = new vscode.Selection(newPos, newPos);
                                                });
                       })
                 .catch(err => console.error("CommaFirst Logic Error:", err));
  }

  // Comma-first formatting for objects, arrays, and function arguments
  function commaFirstSelection(realEditor) {
    return formatSelection(realEditor, "}]),;");
  }

  // Ternary formatting for conditional expressions
  function formatSelectedTernary(realEditor) {
    // Additionally use ? and : as delimiters for ternary formatting
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
        dps,
        ind;

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
                                 chgtxt === "?"     &&
                                 tefActive          &&
                                 txt[pix-1] === " " &&
    (pos === bypassObject(pos) || /^\s*:/.test(txt)) ? ( nix = suppressIrrelevantCharacters(txt).lastIndexOf(":", pix)
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
                                     chgtxt === ","  ? ( [nix, dps, act, ind] = cflActive ? indexOfIndent(txt,pos)
                                                                                            : [-1, -1, false]
                                                       , nix >= 0 &&
                                                         act      ? "{([".includes(txt[nix]) ? editor.edit(eb => ( freeToFix = false
                                                                                                                 , eb.insert(pos.translate(0, 1), " ")
                                                                                                                 , eb.insert(pos, "\n" + ind)
                                                                                                                 , ofs = offsetOfRightPair(txt,pos)
                                                                                                                 , ofs >= 0 && eb.insert( pos.translate(0, ofs)
                                                                                                                                        , "\n" + ind
                                                                                                                                        )
                                                                                                                 ))
                                                                                                     .then(_ => moveCursorTo(pos.line + 1, nix + 2))
                                                                                             : editor.edit(eb => ( freeToFix = false
                                                                                                                 , eb.insert(pos.translate(0,1), " ")
                                                                                                                 , eb.insert(pos, "\n" + ind)
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
                                                ")]".includes(txt[pix-1]) ? ( [nix,,,ind] = indexOfIndent(txt, pos.translate(0,-1), ".")
                                                                            , nix >= 0 && editor.edit(eb => ( freeToFix = false
                                                                                                            , eb.insert(pos, "\n" + ind)
                                                                                                            ))
                                                                            )
                                                                          : Promise.resolve()
                                                     :
                                     chgtxt === "{}" ? ( nix = difActive ? txt.slice(0,pos.character)
                                                                              .search(/\bclass(?:\s+\$?[\w\-]+\s*)*$|function(?:\s+\$?[\w\-]+\s*)*\([^()]*\)|(?<!(?:function|=>).*)(?:(?<=\s+)[\$\[]?[\w\-\]]+\s*\([^\(]*\)(?!.*[\(\.\,]))(?!.*(?:function|=>))|try\s*$|(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*(?=\s*=>\s*$)/)
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
                                                                  : ( [nix,, act, ind] = cflActive ? indexOfIndent(txt, pos, chgtxt)
                                                                                                   : [-1, -1, false]
                                                                    , nix >= 0                    &&
                                                                      act                         &&
                                                                      txt[ nix] !== pairof[chgtxt] ? ( freeToFix = false
                                                                                                     , editor.edit(eb => eb.insert(pos, "\n" + ind))
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