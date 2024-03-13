# Change Log

Change Logs of Wider are are kept in [GNU Style](https://www.gnu.org/prep/standards/html_node/Style-of-Change-Logs.html#Style-of-Change-Logs).

Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date:   Tue Jan 30 21:46:39 2024 +0300

    imp: fixed characters in regex and string literals
         yielding false delimiters
    fix: activator logic at updateActivators() fnc.
         isInComment(txt,pos) fnc. breaks with url
    add: comma-first support for .json files
    rem: unnecessary functions and some parts
    ver: 0.0.2
_________________________________________________

Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date:   Wed Jan 31 22:37:29 2024 +0300

    imp: comma-first support for .json files included
         in the README.md
         pacjage.json now uses comma-first layout
         some tabs replaced with spaces in extension.js
    ver: 0.1.0
_________________________________________________

Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Fri Feb 02 2024 14:11:21 GMT+0300 (GMT+03:00)

    fix: false event checks moved to event handlers.
         isFromKbd boolean disables the text change
         event that originates from the inserts and
         replaces done in fixOnType to invoke itself.
         isFromKbd resets at editor.edit() and sets
         back at .finally() in fixOnType. It gets
         checked in onDidChangeTextDocument handler
         to prevent fixOnType to be invoked for the
         text changes originated from itself.
    ver: 0.1.2
_________________________________________________

Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sat Feb 03 2024 17:01:45 GMT+0300 (GMT+03:00)

    fix: language gets assigned if editor is defined.
         simplified relative image paths in README.md
    ver: 0.1.3
_________________________________________________

Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sat Feb 03 2024 17:35:58 GMT+0300 (GMT+03:00)

    fix: removed editor check which prevented
         disposables to subscribe at installation.
    ver: 0.1.4
_________________________________________________

Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sat Feb 03 2024 21:03:57 GMT+0300 (GMT+03:00)

    fix: false delimiters in comments are eliminated.
         some overlooked formatting in extension.js
    imp: README.md includes issue link to repo
    ver: 0.1.5
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Mon Feb 05 2024 15:34:40 GMT+0300 (GMT+03:00)

    fix: comma-first should disable when no space
         follows the left delimiter and we are on
         lower lines still typing the object.
    imp: README.md
    ver: 0.1.6
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Tue Feb 06 2024 00:39:14 GMT+0300 (GMT+03:00)
 

    fix: delimiters in regexes and comments should be
         working better now.
    imp: README.md
    ver: 0.1.7
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sun Feb 11 2024 17:36:42 GMT+0300 (GMT+03:00)
 

    fix: multiple delimiters at the end of the line
         confusing comma-first.
         when a ternary contains objects the colons
         inside the object confuse ternary layout.
         variable name can start with $ in let|var
         regex.
         comma-first is ok with irrelevant characters.
    add: convert selected object in to comma first
         layout menu command.
         README.md includes selected to comma-first
         feature.
         selection_to_comma-first.gif to ./images
         SUPPORT.md for marketplace integrity
    ver: 0.2.0
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Mon Feb 12 2024 17:02:48 GMT+0300 (GMT+03:00)
 

    fix: single item/property arrays/objects shouldn't
         extend to the next line with comma-first.
    ver: 0.2.1
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Wed Feb 14 2024 21:43:08 GMT+0300 (GMT+03:00)
 

    add: offsetOfRightPair() function
    fix: comma at first line of the block could break
    rem: unused variable
    ver: 0.2.2
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sat Feb 17 2024 15:04:31 GMT+0300 (GMT+03:00)
 

    fix: made ternary to not work in objects due to
         conflicting colon operator in objects.
         ternary question mark can have text after
    rem: forgotten unused variable and some renamings
    ver: 0.2.3
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sun Feb 18 2024 13:36:20 GMT+0300 (GMT+03:00)
 

    fix: menu typos and remove unnecessary parens.
         moved UNDO & REDO check to event listener.
         invoked the dispose function :))
    rem: unnecessary const UNDO
    ver: 0.2.4
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Mon Feb 19 2024 22:24:01 GMT+0300 (GMT+03:00)
 

    fix: removed needless assignment to pos argument
         of indexOfIndent for ternaries. This way pos
         stays constant. This might be useful if and
         when i decide to overload this function with
         an alignment job for variable assignments and
         object colons. Then i might decide to rewrite
         the whole thing to work on a better structure
         rather than the text in the editor for a much
         more efficient formatting. I think that will
         mark the v1.0.0
    add: declaration alingment is ok when terminated
         with ";" token. However it's getting more and
         more complex to handle this way. As mentioned
         above it's best to come up with a better
         mapping of the code text to solve all kinds
         of token based relationships. Road to v1.0.0
    mod: dix, the declaration index replaced with dps;
         the declaration position.
    ver: 0.2.5
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sat Feb 24 2024 16:30:22 GMT+0300 (GMT+03:00)
 

    fix: ";" breaks bad. Seems fixed.
    ver: 0.2.6
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sat Feb 24 2024 17:41:33 GMT+0300 (GMT+03:00)
 

    fix: Breaking Selection to Comma First when there
         are single line comments in the selection is
         now working at the cost of removing the
         comments as a quick fix. Keeping the comments
         is a backlog and will be implemented in next
         releases.
    ver: 0.2.7
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sun Feb 25 2024 18:55:41 GMT+0300 (GMT+03:00)


    fix: .alignDeclaration() fixed.
         Breaking Selection to Comma First when there
         are single line comments in the selection is
         now properly working at the cost of removing
         the comments as a quick fix. In next releases
         a better fix will be implemented.
    rem: unused variables and logs.
    ver: 0.2.8
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Mon Feb 26 2024 16:34:12 GMT+0300 (GMT+03:00)
 

    fix: restored .suppressIrrelevantCharacters() and
         .isDontCare() functions to previous state.
         removing comments in .commaFirstSelection()
         function considers file:///some.txt type url.
         typo in README:md
    mod: package.json with new version
    ver: 0.2.9
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Mon Feb 26 2024 22:28:29 GMT+0300 (GMT+03:00)
 

    fix: .commaFirstSelection() function is more
         stable.
    ver: 0.2.10
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Thu Feb 29 2024 18:02:34 GMT+0300 (GMT+03:00)
 

    fix: alignDeclaration() takes cursor to correct
         position when declarations end with ";".
         restored commaFirstSelection() final line to
         it's previous state.
    mod: alignDeclaration() function moved in code to
         formatting functions section
    ver: 0.2.11
_________________________________________________

Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sat Mar 02 2024 19:43:02 GMT+0300 (GMT+03:00)
 

    fix: stacked chaining is fine when an expression
         sequencing code block in a callback function
         is chained. More in the dev branch comments.
         Ternary "?" doesn't confuse if previous text
         on line has regex or string with ":" in it.
    ver: 0.2.12
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Mon Mar 04 2024 01:42:38 GMT+0300 (GMT+03:00)
 

    fix: when object returning expression sequences
         (comma first type paranthesised code blocks)
         are chained the dot "." gets the opening left
         paranthesis index.
         object methods defined with curly braces are
         now fine.
         "." is ok when there is variable declarations
         in paranthesis such as .then(function(){let})
    mod: typo fix in README.md
    ver: 0.2.13
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Fri Mar 08 2024 16:00:37 GMT+0300 (GMT+03:00)
 

    fix: ";" works fine in variable declarations
         "{}" wont trigger if used as object parameter
         stacked chaining change introduced by commmit
         018da2a12508a373523023257a9f83214d1ea4b2 in
         v0.2.12 reverted back. Bad Idea.
    ver: 0.2.14
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Committer: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Fri Mar 08 2024 23:00:03 GMT+0300 (GMT+03:00)
 
    fix: "{}" indented correctly with shorthand object
         method definitions.
    add: const keyword also gets special powers like
         let and var.
    rem: forgotten console.log()s
    ver: 0.2.15
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sun Mar 10 2024 15:25:05 GMT+0300 (GMT+03:00)
 

    add: "{}" benefits from arrow functions along with
         computed keys of shorthand method definitions
    mod: README.md
    ver: 0.2.16
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Sun Mar 10 2024 22:25:11 GMT+0300 (GMT+03:00)
 

    fix: object parameters are difficult when it comes
         to disabling them to trigger "{}" action. As
         of this version they are fixed to a level in
         order to have correct indenting first enter
         the "{}" those defining the function's scope
         and then enter the object parameters so that
         everything gets indented properly. This will
         remain as is until it receives a proper fix.
    mod: README.md to reflect object parameters fix.
    ver: 0.2.17
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Mon Mar 11 2024 00:19:33 GMT+0300 (GMT+03:00)
 

    fix: bypassObject() function takes "try {" case
         into account yielding ternaries to work in
         try blocks.
    ver: 0.2.18
_________________________________________________
Author: Ömer Kaşdarma <omer.kasdarma@gmail.com>
Date: Wed Mar 13 2024 19:40:00 GMT+0300 (GMT+03:00)
 

    fix: "{}" may this time work better in all kind of
         function / method definitions, destructuring
         arguments included.
         const|let|var was breaking comma-first when
         they were defined in a function which resides
         in comma-first applicable block or object.
    ver: 0.2.19