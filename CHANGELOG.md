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