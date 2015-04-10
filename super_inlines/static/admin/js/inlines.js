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
    var idRegex = new RegExp("(" + prefix + "-(\\d+|__prefix__))");
    var replacement = prefix + "-" + index;
    $.each(['for', 'id', 'name'], function(i, attrName) {
      $elements.each(function() {
        var $el = $(this), attr = $el.attr(attrName);
        if (attr) {
          $el.attr(attrName, attr.replace(idRegex, replacement));
        }
      });
    });
  }

  function initPrepopulatedFields($row) {
    $row.find('.prepopulated_field').each(function() {
      var $input = $(this).find('input, select, textarea'),
          dependency_list = $input.data('dependency_list') || [],
          dependencies = [];
      $.each(dependency_list, function(i, fieldName) {
        dependencies.push('#' + $row.find('.field-' + fieldName).find('input, select, textarea').attr('id'));
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

  $.fn.formset = function(opts) {
    var options = $.extend({}, $.fn.formset.defaults, opts);
    var $parent = this;
    var inlineType = $parent.data('inline-type');
    function getFormsIncludingEmpty() {
      if (inlineType == 'stacked') {
        return $parent.find('> .inline-related');
      }
      return $parent.find('> .inline-related > fieldset > table > tbody > .form-row');
    }
    function getForms() {
      return getFormsIncludingEmpty().not('.' + options.emptyCssClass)
    }

    function alternatingRows() {
      getForms().removeClass("row1 row2")
        .filter(":even").addClass("row1").end()
        .filter(":odd").addClass("row2");
    }
    function updateInlineLabel() {
      getForms().find('> h3 > .inline_label').each(function(i) {
        var $rowLabel = $(this);
        $rowLabel.html($rowLabel.html().replace(/(#\d+)/g, "#" + (i + 1)));
      });
    }

    var prefix = $parent.data('prefix');
    var formCssClass = 'dynamic-' + prefix;
    var addText = $parent.data('add-text');
    var deleteText = $parent.data('delete-text');
    var $totalForms = $parent.find('[name="' + prefix + '-TOTAL_FORMS"]').attr("autocomplete", "off");
    var nextIndex = parseInt($totalForms.val());
    var $maxForms = $parent.find('[name="' + prefix + '-MAX_NUM_FORMS"]').attr("autocomplete", "off");
    var $forms = getFormsIncludingEmpty();
    var $template = $forms.filter('.' + options.emptyCssClass);
    function canShowAddButton() {
      // only show the add button if we are allowed to add more items,
      // note that max_num = None translates to a blank string.
      return ($maxForms.val() === '') || ($maxForms.val()-$totalForms.val()) > 0;
    }
    if ($forms.length && canShowAddButton()) {
      var $buttonContainer;
      var $addButton = $('<a href="#">' + addText + '</a>');
      if (inlineType == 'tabular') {
        // If forms are laid out as table rows, create the
        // "add" button in a new table row:
        var numCols = $template.children().length;
        $buttonContainer = $('<tr class="' + options.addCssClass + '"><td colspan="' + numCols + '"></td></tr>');
        $buttonContainer.find('td').append($addButton);
        $parent.find('tbody').append($buttonContainer)
      } else {
        // Otherwise, create it immediately after the last form:
        $buttonContainer = $('<div class="' + options.addCssClass + '"></div>');
        $buttonContainer.append($addButton);
        $parent.append($buttonContainer);
      }

      $addButton.click(function(e) {
        e.preventDefault();
        var $row = $template.clone(true);
        $row.removeClass(options.emptyCssClass)
          .addClass(formCssClass)
          .attr("id", prefix + "-" + nextIndex);
        var $removeButton = $('<a class="' + options.deleteCssClass +'" href="#">' + deleteText + '</a>');
        var $buttonContainer;
        if (inlineType == 'tabular') {
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
        fillAttrPlaceholders($row.find("*"), $row.parents('.inline-related').attr('id') + prefix, $totalForms.val());
        // Insert the new form when it has been fully edited
        if (inlineType == 'stacked') {
          $(this).parent().prev().before($row);
        } else {
          $(this).parent().parent().parent().find('.' + options.emptyCssClass).before($row);
        }
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
          var $row = $(this).parents("." + formCssClass).first();
          $row.remove();
          nextIndex -= 1;

          if (inlineType == 'stacked') {
            updateInlineLabel();
          } else {
            alternatingRows();
          }

          // Update the TOTAL_FORMS form count.
          var $forms = getForms();
          $totalForms.val($forms.length);
          // Show add button again once we drop below max
          if (canShowAddButton()) {
            $addButton.parent().show();
          }
          // Also, fill placeholders in attributes
          // for all remaining form controls so they remain in sequence:
          $forms.each(function(i) {
            fillAttrPlaceholders($(this).find('*').addBack(), prefix, i);
          });
        });

        initPrepopulatedFields($row);
        reinitDateTimeShortCuts();
        updateSelectFilter();
        if (inlineType == 'stacked') {
          updateInlineLabel();
        } else {
          alternatingRows();
        }

        $row.find('.inline-group').formset();
      });
    }
    return this;
  };

  /* Setup plugin defaults */
  $.fn.formset.defaults = {
    addCssClass: 'add-row',
    deleteCssClass: 'inline-deletelink',
    emptyCssClass: 'empty-form'
  };

})(django.jQuery);
