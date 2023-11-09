// ==UserScript==
// @name         🐭️ MouseHunt - Item Links
// @version      1.4.7
// @description  Add links to the MouseHunt wiki, MHCT looter, MHDB, and Markethunt for items.
// @license      MIT
// @author       bradp
// @namespace    bradp
// @match        https://www.mousehuntgame.com/*
// @icon         https://i.mouse.rip/mouse.png
// @grant        none
// @run-at       document-end
// ==/UserScript==

((function () {
  'use strict';

  /**
   * Add styles to the page.
   *
   * @param {string} styles The styles to add.
   */
  const addStyles = (styles) => {
    const existingStyles = document.getElementById('mh-mouseplace-custom-styles');

    if (existingStyles) {
      existingStyles.innerHTML += styles;
    } else {
      const style = document.createElement('style');
      style.id = 'mh-mouseplace-custom-styles';

      style.innerHTML = styles;
      document.head.appendChild(style);
    }
  };

  /**
   * Do something when ajax requests are completed.
   *
   * @param {Function} callback    The callback to call when an ajax request is completed.
   * @param {string}   url         The url to match. If not provided, all ajax requests will be matched.
   * @param {boolean}  skipSuccess Skip the success check.
   */
  const onAjaxRequest = (callback, url = null, skipSuccess = false) => {
    const req = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener('load', function () {
        if (this.responseText) {
          let response = {};
          try {
            response = JSON.parse(this.responseText);
          } catch (e) {
            return;
          }

          if (response.success || skipSuccess) {
            if (! url) {
              callback(this);
              return;
            }

            if (this.responseURL.indexOf(url) !== -1) {
              callback(this);
            }
          }
        }
      });
      req.apply(this, arguments);
    };
  };

  /**
   * Return an anchor element with the given text and href.
   *
   * @param {string} text Text to use for link.
   * @param {string} href URL to link to.
   *
   * @return {string} HTML for link.
   */
  const makeLink = (text, href) => {
    href = href.replace(/\s/g, '_');
    return `<a href="${href}" class="mousehuntActionButton tiny mh-item-links"><span>${text}</span></a>`;
  };

  /**
   * Return a node with links after grabbing the item ID and name from the page.
   *
   * @param {Object} args       Arguments to use for the links.
   * @param {string} args.id    CSS selector for the item ID.
   * @param {string} args.name  CSS selector for the item name.
   * @param {string} args.class CSS class to add to the node.
   *
   * @return {false|string} False if no item ID or name found, otherwise HTML for links.
   */
  const getLinksNode = (args) => {
    const itemInfo = document.querySelector(args.id);
    if (! itemInfo) {
      return false;
    }

    const itemID = itemInfo.getAttribute('data-item-id');
    const itemName = document.querySelector(args.name).textContent;
    if (! itemID || ! itemName) {
      return false;
    }

    const existingText = document.querySelector('.mh-item-info-text');
    if (existingText) {
      existingText.remove();
    }

    const newText = document.createElement('div');
    newText.classList.add('mh-item-info-text');

    if (args.class) {
      newText.classList.add(args.class);
    }

    // Add link to the wiki.
    newText.innerHTML = makeLink('Wiki', `https://mhwiki.hitgrab.com/wiki/index.php/${itemName}`);

    // Link to MHCT, either converter or looter.
    const isConvertible = document.querySelector(args.id + ' .itemView-action.convertible');
    newText.innerHTML += (isConvertible && isConvertible.innerText)
      ? makeLink('MHCT Converter', `https://www.mhct.win/converter.php?item=${itemID}&timefilter=all_time`)
      : makeLink('MHCT Looter', `https://www.mhct.win/loot.php?item=${itemID}&timefilter=all_time`);

    // Link to mhdb.
    const mhdbName = itemName.replace(/'/g, '');
    newText.innerHTML += makeLink('mhdb', `https://dbgames.info/mousehunt/items/${mhdbName}`);

    // Link to markethunt.
    const isTradable = document.querySelectorAll('.itemView-sidebar-checklistItem.checked');
    if (args.forceType === 'marketplace' || (isTradable && isTradable.length === 2)) {
      newText.innerHTML += makeLink('Markethunt', `https://markethunt.win/index.php?item_id=${itemID}`);
    }

    return newText;
  };

  /**
   * Append text to a node, either before or after another node.
   *
   * @param {Object} args         Arguments to use for the text.
   * @param {string} args.parent  CSS selector for the parent node.
   * @param {string} args.child   CSS selector for the child node.
   * @param {string} args.content Text to append.
   *
   * @return {Node} The node that was appended to.
   */
  const appendText = (args) => {
    const append = document.querySelector(args.parent);
    if (! append) {
      return false;
    }

    if (args.child) {
      const child = document.querySelector(args.child);
      if (child && args.content) {
        return append.insertBefore(args.content, child);
      }
    } else {
      return append.appendChild(args.content);
    }

    return false;
  };

  /**
   * Add links to the marketplace page for an item.
   */
  const addMarketplaceLinks = () => {
    appendText({
      parent: '.marketplaceView-item-titleActions',
      child: '.marketplaceView-userGold',

      content: getLinksNode({
        id: '.marketplaceView-item.view',
        name: '.marketplaceView-item-titleName',
        forceType: 'marketplace',
      })
    });
  };

  /**
   * Add links to the item popup for an item.
   */
  const addItemPopupLinks = () => {
    appendText({
      parent: '.itemView-header-name',
      content: getLinksNode({
        id: '.itemViewContainer',
        name: '.itemView-header-name span',
        class: 'mh-item-info-text-item-popup'
      }),
    });
  };

  /**
   * Fix item qty bug - see https://greasyfork.org/en/scripts/445926-mousehunt-item-quantity-fix
   */
  const fixItemQtyBug = () => {
    // Make sure we have the ID parameter.
    if (window.location.href.indexOf('i.php?id=') === -1) {
      return;
    }

    // Grab the item ID.
    const itemID = window.location.href.split('i.php?id=')[ 1 ];
    if (! itemID) {
      return;
    }

    // Make sure the quantity shown is 0.
    const qty = document.querySelector('.itemView-sidebar-quantity');
    if (! (qty && qty.textContent.indexOf('You Own:') !== -1)) {
      return;
    }

    // Grab the item slug.
    const itemName = document.querySelector('.itemViewContainer').getAttribute('data-item-type');
    if (! itemName) {
      return;
    }

    // redirect to item.php?item_type=itemName
    const newLocation = window.location.href.replaceAll(`i.php?id=${itemID}`, `item.php?item_type=${itemName}`);
    if (newLocation !== window.location.href) {
      window.location.href = newLocation;
    }
  };

  fixItemQtyBug();

  addStyles(`.mh-item-info-text {
    display: inline-block;
    margin-right: 10px;
    margin-left: 10px;
  }

  .mh-item-info-text-item-popup {
    position: relative;
    top: 12px;
    right: 12px;
    display: block;
    width: auto;
    margin: 0;
    text-align: right;
  }

  .mh-item-links {
    margin-left: 5px;
  }

  .mh-item-links span {
    font-size: 11px;
    font-weight: 400;
  }

  .mh-item-links-map {
    padding-bottom: 5px;
  }

  .mh-item-links-map a {
    margin: 10px 10px 10px 0;
  }

  .mh-item-links-map .mousehuntActionButton.tiny {
    margin: 3px;
  }
  `);

  onAjaxRequest((request) => {
    if (request.responseURL.indexOf('managers/ajax/users/marketplace.php') !== -1) {
      addMarketplaceLinks();
    } else if (request.responseURL.indexOf('managers/ajax/users/userInventory.php') !== -1) {
      addItemPopupLinks();
    }
  }, null, true);

  // if we're on an item page, add the links.
  if (window.location.href.indexOf('item.php') !== -1) {
    addItemPopupLinks();
  }
})());
