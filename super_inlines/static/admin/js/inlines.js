(function($) {

  //
  // InlineForm class
  //

  function InlineForm(formset, $row) {
    this.formset = formset;
    this.updateIndex(this.formset.forms.length);
    this.formset.forms.push(this);

    this.isInitial = typeof $row !== 'undefined';

    if (this.isInitial) {
      this.$row = $row;
      var $idInput = this.$row.find('[name="' + this.prefix + '-id"]');
      this.hasOriginal = $idInput.val() !== '';
    } else {
      this.$row = (this.formset.$templateForm.clone(true)
                   .removeClass(this.formset.emptyCssClass)
                   .addClass(this.formset.formCssClass));
      this.hasOriginal = false;
    }

    if (!this.hasOriginal) {
      this.createRemoveButton();
    }

    this.formset.$templateForm.before(this.$row); // Inserts the form

    this.formset.update();

    this.initPrepopulatedFields();
    reinitDateTimeShortCuts();
    updateSelectFilter();

    this.$row.find('.inline-group').each(function (_, subFormset) {
      $(subFormset).formset(this);
    }.bind(this));
  }

  InlineForm.prototype.createRemoveButton = function() {
    this.$removeButton = $('<a class="' + this.formset.removeCssClass +'" href="#">' + this.formset.removeText + '</a>');

    if (this.formset.inlineType == 'tabular') {
      this.$removeButtonContainer = $('<div></div>');
      this.$row.children(':last').append(this.$removeButtonContainer);
    } else {
      this.$removeButtonContainer = $('<span></span>');
      this.$row.children(':first').append(this.$removeButtonContainer);
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
    var idRegex = new RegExp('((?:' + this.formset.fullPrefix + '|' + this.formset.prefix + ')-(?:\\d+|__prefix__))');
    var formPrefix = this.prefix;
    $.each(['for', 'id', 'name'], function(i, attrName) {
      $elements.each(function() {
        var $el = $(this), attr = $el.attr(attrName);
        if (attr) {
          $el.attr(attrName, attr.replace(idRegex, formPrefix));
        }
      });
    });
  };

  InlineForm.prototype.updateIndex = function(index) {
    this.index = index;
    this.prefix = this.formset.fullPrefix + '-' + this.index;
  };

  InlineForm.prototype.updateClass = function() {
    if (this.index % 2 == 0) {
      this.$row.addClass('row1').removeClass('row2');
    } else {
      this.$row.addClass('row2').removeClass('row1');
    }
  };

  InlineForm.prototype.updateLabel = function() {
    var $rowLabel = this.$row.find('> h3 > .inline_label');
    $rowLabel.html($rowLabel.html().replace(/(#\d+)/g, '#' + (this.index + 1)));
  };

  InlineForm.prototype.update = function(index) {
    this.updateIndex(index);
    this.fillAttrPlaceholders();
    if (this.formset.inlineType == 'tabular') {
      this.updateClass();
    } else {
      this.updateLabel();
    }
  };

  //
  // InlineFormSet class
  //

  function InlineFormSet($root, parentInlineForm) {
    this.$root = $root;
    this.parentInlineForm = parentInlineForm;
    this.inlineType = this.$root.data('inline-type');

    this.prefix = this.$root.data('prefix');
    this.fullPrefix = this.prefix;
    if (typeof this.parentInlineForm !== 'undefined' && !this.parentInlineForm.isInitial) {
      this.fullPrefix += '-' + this.parentInlineForm.index;
    }

    this.addCssClass = 'add-row';
    this.removeCssClass = 'inline-deletelink';
    this.emptyCssClass = 'empty-form';
    this.formCssClass = 'dynamic-' + this.prefix;

    this.addText = this.$root.data('add-text');
    this.removeText = this.$root.data('remove-text');

    this.$totalForms = this.$root.find('[name="' + this.prefix + '-TOTAL_FORMS"]').attr('autocomplete', 'off');
    this.$initialForms = this.$root.find('[name="' + this.prefix + '-INITIAL_FORMS"]').attr('autocomplete', 'off');
    this.$maxForms = this.$root.find('[name="' + this.prefix + '-MAX_NUM_FORMS"]').attr('autocomplete', 'off');
    this.$totalForms.attr('name', this.fullPrefix + '-TOTAL_FORMS');
    this.$initialForms.attr('name', this.fullPrefix + '-INITIAL_FORMS');
    this.$maxForms.attr('name', this.fullPrefix + '-MAX_NUM_FORMS');

    this.$templateForm = this.getFormsAndTemplate().filter('.' + this.emptyCssClass);

    this.$addButton = $('<a href="#">' + this.addText + '</a>');

    if (this.inlineType == 'tabular') {
      var numCols = this.$templateForm.children().length;
      this.$addButtonContainer = $('<tr class="' + this.addCssClass + '"><td colspan="' + numCols + '"></td></tr>');
      this.$addButtonContainer.find('td').append(this.$addButton);
    } else {
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
    var $rows = this.$root.find('> .inline-related');
    if (this.inlineType == 'tabular') {
      return $rows.find('> fieldset > table > tbody > .form-row');
    }
    return $rows;
  };

  InlineFormSet.prototype.getForms = function() {
    return this.getFormsAndTemplate().not('.' + this.emptyCssClass)
  };

  InlineFormSet.prototype.canAdd = function() {
    // Note: if `max_num` is None, $maxForms.val() == ''
    return (this.$maxForms.val() === '')
            || (this.$maxForms.val()-this.$totalForms.val()) > 0;
  };

  InlineFormSet.prototype.addHandler = function(e) {
    e.preventDefault();
    if (this.canAdd()) {
      new InlineForm(this);
    }
  };

  InlineFormSet.prototype.update = function() {
    this.forms.forEach(function(form, index) {
      form.update(index);
    });

    this.$totalForms.val(this.forms.length);

    this.$addButtonContainer.toggle(this.canAdd());
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

  $.fn.formset = function(parentInlineForm) {
    new InlineFormSet(this, parentInlineForm);
    return this;
  };

})(django.jQuery);
