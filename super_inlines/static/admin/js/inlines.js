(function($) {

  //
  // InlineForm class
  //

  function InlineForm(formset, $row) {
    this.formset = formset;
    this.isInitial = (typeof $row !== 'undefined');
    if (this.isInitial) {
      this.$row = $row;
    } else {
      this.$row = this.formset.$templateForm.clone(true);
    }

    this.$row.removeClass(this.formset.emptyCssClass).addClass(this.formset.formCssClass);
    this.index = this.formset.forms.length;
    this.formset.forms.push(this);

    if (!this.isInitial) {
      this.createRemoveButton();
    }

    this.formset.$templateForm.before(this.$row); // Inserts the form

    this.formset.update();

    this.initPrepopulatedFields();
    reinitDateTimeShortCuts();
    updateSelectFilter();

    this.$row.find('.inline-group').formset();
  }

  InlineForm.prototype.createRemoveButton = function() {
    this.$removeButton = $('<a class="' + this.formset.deleteCssClass +'" href="#">' + this.formset.deleteText + '</a>');

    if (this.formset.inlineType == 'tabular') {
      // If the forms are laid out in table rows, insert
      // the remove button into the last table cell:
      this.$removeButtonContainer = $('<div></div>');
      this.$row.children(":last").append(this.$removeButtonContainer);
    } else if (this.$row.is('ul, ol')) {
      // If they're laid out as an ordered/unordered list,
      // insert an <li> after the last list item:
      this.$removeButtonContainer = $('<li></li>');
      this.$row.append(this.$removeButtonContainer);
    } else {
      // Otherwise, just insert the remove button as the
      // last child element of the form's container:
      this.$removeButtonContainer = $('<span></span>');
      this.$row.children(":first").append(this.$removeButtonContainer);
    }

    this.$removeButtonContainer.append(this.$removeButton);
    this.$removeButton.click(this.removeHandler.bind(this));
  };

  InlineForm.prototype.removeHandler = function(e) {
    e.preventDefault();
    this.$row.remove();
    this.formset.forms.splice(this.index, 1);  // Unregisters the form
    this.formset.update();
  };

  InlineForm.prototype.initPrepopulatedFields = function() {
    var $row = this.$row;
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
  };

  InlineForm.prototype.fillAttrPlaceholders = function() {
    var $elements = this.$row.find('*').addBack();
    var idRegex = new RegExp("(" + this.formset.prefix + "-(?:\\d+|__prefix__))");
    var rowName = this.formset.prefix + '-' + this.index;
    $.each(['for', 'id', 'name'], function(i, attrName) {
      $elements.each(function() {
        var $el = $(this), attr = $el.attr(attrName);
        if (attr) {
          $el.attr(attrName, attr.replace(idRegex, rowName));
        }
      });
    });
  };

  InlineForm.prototype.updateLabel = function() {
    var $rowLabel = this.$row.find('> h3 > .inline_label');
    $rowLabel.html($rowLabel.html().replace(/(#\d+)/g, '#' + (this.index + 1)));
  };

  //
  // InlineFormSet class
  //

  function InlineFormSet($root) {
    this.$root = $root;
    this.inlineType = this.$root.data('inline-type');

    this.prefix = this.$root.data('prefix');
    this.addCssClass = 'add-row';
    this.deleteCssClass = 'inline-deletelink';
    this.emptyCssClass = 'empty-form';
    this.formCssClass = 'dynamic-' + this.prefix;

    this.addText = this.$root.data('add-text');
    this.deleteText = this.$root.data('delete-text');

    this.$totalForms = this.$root.find('[name="' + this.prefix + '-TOTAL_FORMS"]').attr("autocomplete", "off");
    this.$maxForms = this.$root.find('[name="' + this.prefix + '-MAX_NUM_FORMS"]').attr("autocomplete", "off");

    this.$templateForm = this.getFormsAndTemplate().filter('.' + this.emptyCssClass);

    this.$addButton = $('<a href="#">' + this.addText + '</a>');

    if (this.inlineType == 'tabular') {
      // If forms are laid out as table rows, create the
      // "add" button in a new table row:
      var numCols = this.$templateForm.children().length;
      this.$addButtonContainer = $('<tr class="' + this.addCssClass + '"><td colspan="' + numCols + '"></td></tr>');
      this.$addButtonContainer.find('td').append(this.$addButton);
    } else {
      // Otherwise, create it immediately after the last form:
      this.$addButtonContainer = $('<div class="' + this.addCssClass + '"></div>');
      this.$addButtonContainer.append(this.$addButton);
    }
    this.$templateForm.after(this.$addButtonContainer);

    this.forms = [];
    // Adds already existing forms
    this.getForms().each(function (i, row) {
      new InlineForm(this, $(row));
    }.bind(this));

    this.$addButton.click(this.addHandler.bind(this));
  }

  InlineFormSet.prototype.getFormsAndTemplate = function() {
    if (this.inlineType == 'stacked') {
      return this.$root.find('> .inline-related');
    }
    return this.$root.find('> .inline-related > fieldset > table > tbody > .form-row');
  };

  InlineFormSet.prototype.getForms = function() {
    return this.getFormsAndTemplate().not('.' + this.emptyCssClass)
  };

  InlineFormSet.prototype.updateLabels = function() {
    this.forms.forEach(function(form) {
      form.updateLabel();
    });
  };

  InlineFormSet.prototype.alternateRows = function() {
    this.getForms().removeClass("row1 row2")
      .filter(":even").addClass("row1").end()
      .filter(":odd").addClass("row2");
  };

  InlineFormSet.prototype.canShowAddButton = function() {
    // only show the add button if we are allowed to add more items,
    // note that max_num = None translates to a blank string.
    return (this.$maxForms.val() === '')
            || (this.$maxForms.val()-this.$totalForms.val()) > 0;
  };

  InlineFormSet.prototype.addHandler = function(e) {
    e.preventDefault();
    new InlineForm(this);
  };

  InlineFormSet.prototype.update = function() {
    this.forms.forEach(function(form, index) {
      form.index = index;
      form.fillAttrPlaceholders();
    });

    if (this.inlineType == 'stacked') {
      this.updateLabels();
    } else {
      this.alternateRows();
    }

    this.$totalForms.val(this.forms.length);

    this.$addButtonContainer.toggle(this.canShowAddButton());
  };

  //
  // Utilities
  //

  function reinitDateTimeShortCuts() {
    // Reinitialize the calendar and clock widgets by force
    if (typeof DateTimeShortcuts !== 'undefined') {
      $('.datetimeshortcuts').remove();
      DateTimeShortcuts.init();
    }
  }

  function updateSelectFilter() {
    // If any SelectFilter widgets are a part of the new form,
    // instantiate a new SelectFilter instance for it.
    if (typeof SelectFilter !== 'undefined'){
      function inner(bool){
        return function() {
          var namearr = this.name.split('-');
          SelectFilter.init(this.id, namearr[namearr.length-1], bool);
        };
      }
      $('.selectfilter').each(inner(false));
      $('.selectfilterstacked').each(inner(true));
    }
  }

  //
  // jQuery plugin creation
  //

  $.fn.formset = function() {
    new InlineFormSet(this);
    return this;
  };

})(django.jQuery);
