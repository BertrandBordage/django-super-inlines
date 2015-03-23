/**
 * Django admin inlines
 *
 * Based on jQuery Formset 1.1
 * @author Stanislaus Madueke (stan DOT madueke AT gmail DOT com)
 * @requires jQuery 1.2.6 or later
 *
 * Copyright (c) 2009, Stanislaus Madueke
 * All rights reserved.
 *
 * Spiced up with Code from Zain Memon's GSoC project 2009
 * and modified for Django by Jannis Leidel, Travis Swicegood and Julien Phalip.
 *
 * Licensed under the New BSD License
 * See: http://www.opensource.org/licenses/bsd-license.php
 */
(function($) {

  function fillAttrPlaceholders($elements, prefix, index) {
    var id_regex = new RegExp("(" + prefix + "-(\\d+|__prefix__))");
    var replacement = prefix + "-" + index;
    $.each(['for', 'id', 'name'], function(i, attrName) {
      $elements.each(function() {
        var $el = $(this), attr = $el.attr(attrName);
        if (attr) {
          $el.attr(attrName, attr.replace(id_regex, replacement));
        }
      });
    });
  }

  $.fn.formset = function(opts) {
    var options = $.extend({}, $.fn.formset.defaults, opts);
    var $parent = this.parent();
    var $totalForms = $("#id_" + options.prefix + "-TOTAL_FORMS").prop("autocomplete", "off");
    var nextIndex = parseInt($totalForms.val());
    var $maxForms = $("#id_" + options.prefix + "-MAX_NUM_FORMS").prop("autocomplete", "off");
    function canShowAddButton() {
      return ($maxForms.val() === '') || ($maxForms.val()-$totalForms.val()) > 0;
    }
    // only show the add button if we are allowed to add more items,
        // note that max_num = None translates to a blank string.
    this.not("." + options.emptyCssClass).addClass(options.formCssClass);
    if (this.length && canShowAddButton()) {
      var $buttonContainer;
      var $addButton = $('<a href="#">' + options.addText + '</a>');
      if (this.is('tr')) {
        // If forms are laid out as table rows, create the
        // "add" button in a new table row:
        var numCols = this.last().children().length;
        $buttonContainer = $('<tr class="' + options.addCssClass + '"><td colspan="' + numCols + '"></td></tr>');
        $buttonContainer.find('td').append($addButton);
      } else {
        // Otherwise, create it immediately after the last form:
        $buttonContainer = $('<div class="' + options.addCssClass + '"></div>');
        $buttonContainer.append($addButton);
      }
      $parent.append($buttonContainer);  // Inserts the button.

      $addButton.click(function(e) {
        e.preventDefault();
        var $template = $("#" + options.prefix + "-empty");
        var $row = $template.clone(true);
        $row.removeClass(options.emptyCssClass)
          .addClass(options.formCssClass)
          .attr("id", options.prefix + "-" + nextIndex);
        var $removeButton = $('<a class="' + options.deleteCssClass +'" href="#">' + options.deleteText + '</a>');
        var $buttonContainer;
        if ($row.is('tr')) {
          // If the forms are laid out in table rows, insert
          // the remove button into the last table cell:
          $buttonContainer = $('<div></div>');
          $row.children(":last").append($buttonContainer);
        } else if ($row.is('ul, ol')) {
          // If they're laid out as an ordered/unordered list,
          // insert an <li> after the last list item:
          $buttonContainer = $('<li></li>');
          $row.append($buttonContainer);
        } else {
          // Otherwise, just insert the remove button as the
          // last child element of the form's container:
          $buttonContainer = $('<span></span>');
          $row.children(":first").append($buttonContainer);
        }
        $buttonContainer.append($removeButton);
        fillAttrPlaceholders($row.find("*"), options.prefix, $totalForms.val());
        // Insert the new form when it has been fully edited
        $template.before($row);
        // Update number of total forms
        $totalForms.val(parseInt($totalForms.val()) + 1);
        nextIndex += 1;
        // Hide add button in case we've hit the max, except we want to add infinitely
        if (!canShowAddButton()) {
          $addButton.parent().hide();
        }
        // The delete button of each row triggers a bunch of other things
        $removeButton.click(function(e) {
          e.preventDefault();
          // Remove the parent form containing this button:
          var $row = $(this).parents("." + options.formCssClass);
          $row.remove();
          nextIndex -= 1;
          // If a post-delete callback was provided, call it with the deleted form:
          if (options.removed) {
            options.removed($row);
          }
          // Update the TOTAL_FORMS form count.
          var $forms = $("." + options.formCssClass);
          $totalForms.val($forms.length);
          // Show add button again once we drop below max
          if (canShowAddButton()) {
            $addButton.parent().show();
          }
          // Also, fill placeholders in attributes
          // for all remaining form controls so they remain in sequence:
          $forms.each(function(i) {
            fillAttrPlaceholders($(this).find('*').addBack(), options.prefix, i);
          });
        });
        // If a post-add callback was supplied, call it with the added form:
        if (options.added) {
          options.added($row);
        }
      });
    }
    return this;
  };

  /* Setup plugin defaults */
  $.fn.formset.defaults = {
    prefix: "form",          // The form prefix for your django formset
    addText: "add another",      // Text for the add link
    deleteText: "remove",      // Text for the delete link
    addCssClass: "add-row",      // CSS class applied to the add link
    deleteCssClass: "delete-row",  // CSS class applied to the delete link
    emptyCssClass: "empty-row",    // CSS class applied to the empty row
    formCssClass: "dynamic-form",  // CSS class applied to each form in a formset
    added: null,          // Function called each time a new form is added
    removed: null          // Function called each time a form is deleted
  };

  function initPrepopulatedFields($row) {
    $row.find('.prepopulated_field').each(function() {
      var $input = $(this).find('input, select, textarea'),
          dependency_list = $input.data('dependency_list') || [],
          dependencies = [];
      $.each(dependency_list, function(i, field_name) {
        dependencies.push('#' + $row.find('.field-' + field_name).find('input, select, textarea').attr('id'));
      });
      if (dependencies.length) {
        $input.prepopulate(dependencies, $input.attr('maxlength'));
      }
    });
  }

  function reinitDateTimeShortCuts() {
    // Reinitialize the calendar and clock widgets by force
    if (typeof DateTimeShortcuts != 'undefined') {
      $('.datetimeshortcuts').remove();
      DateTimeShortcuts.init();
    }
  }

  function updateSelectFilter() {
    // If any SelectFilter widgets are a part of the new form,
    // instantiate a new SelectFilter instance for it.
    if (typeof SelectFilter != 'undefined'){
      $('.selectfilter').each(function(){
        var namearr = this.name.split('-');
        SelectFilter.init(this.id, namearr[namearr.length-1], false);
      });
      $('.selectfilterstacked').each(function(){
        var namearr = this.name.split('-');
        SelectFilter.init(this.id, namearr[namearr.length-1], true);
      });
    }
  }

  // Tabular inlines ---------------------------------------------------------
  $.fn.tabularFormset = function(options) {
    var rowsSelector = this.selector;
    var alternatingRows = function() {
      $(rowsSelector).not(".add-row").removeClass("row1 row2")
        .filter(":even").addClass("row1").end()
        .filter(":odd").addClass("row2");
    };

    this.formset({
      prefix: options.prefix,
      addText: options.addText,
      formCssClass: "dynamic-" + options.prefix,
      deleteCssClass: "inline-deletelink",
      deleteText: options.deleteText,
      emptyCssClass: "empty-form",
      removed: alternatingRows,
      added: function($row) {
        initPrepopulatedFields($row);
        reinitDateTimeShortCuts();
        updateSelectFilter();
        alternatingRows();
      }
    });

    return this;
  };

  // Stacked inlines ---------------------------------------------------------
  $.fn.stackedFormset = function(options) {
    var rowsSelector = this.selector;
    var updateInlineLabel = function() {
      $(rowsSelector).find(".inline_label").each(function(i) {
        var $row = $(this);
        $row.html($row.html().replace(/(#\d+)/g, "#" + (i + 1)));
      });
    };

    this.formset({
      prefix: options.prefix,
      addText: options.addText,
      formCssClass: "dynamic-" + options.prefix,
      deleteCssClass: "inline-deletelink",
      deleteText: options.deleteText,
      emptyCssClass: "empty-form",
      removed: updateInlineLabel,
      added: (function($row) {
        initPrepopulatedFields($row);
        reinitDateTimeShortCuts();
        updateSelectFilter();
        updateInlineLabel();
      })
    });

    return this;
  };
})(django.jQuery);
