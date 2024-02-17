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