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

    if (this.formset.inlineType == 'tabular') {
      this.$tools = this.$row.find('> .grp-tr > .grp-tools-container > .grp-tools');
    } else {
      this.$tools = this.$row.find('> .grp-tools');
    }

    if (this.hasOriginal) {
      this.$deletebutton = this.$tools.find('.grp-delete-handler');
      this.$deletebutton.bind("click", function() {
        var $deleteInput = this.$deletebutton.prev();
        $deleteInput.attr('checked', !$deleteInput.attr('checked'));
        this.$row.toggleClass('grp-predelete');
      }.bind(this));
    } else {
      this.createRemoveButton();
    }

    this.formset.$templateForm.before(this.$row); // Inserts the form

    this.formset.update();

    this.initPrepopulatedFields();

    this.formset.onAfterAdd(this.formset.$root, this.$row, this.formset.fullPrefix, this.isInitial);

    this.$row.find('.grp-group').each(function (_, subFormset) {
      $(subFormset).formset(this.formset.onAfterAdd, this.formset.postInit, this);
    }.bind(this));
  }

  InlineForm.prototype.createRemoveButton = function() {
    this.$removeButton = this.$tools.find('.' + this.formset.removeCssClass);
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

  InlineForm.prototype.update = function(index) {
    this.updateIndex(index);
    this.fillAttrPlaceholders();
  };

  //
  // InlineFormSet class
  //

  function InlineFormSet($root, onAfterAdd, postInit, parentInlineForm) {
    this.$root = $root;
    this.parentInlineForm = parentInlineForm;
    this.inlineType = this.$root.data('inline-type');

    this.prefix = this.$root.data('prefix');
    this.fullPrefix = this.prefix;
    if (typeof this.parentInlineForm !== 'undefined' && !this.parentInlineForm.isInitial) {
      this.fullPrefix += '-' + this.parentInlineForm.index;
    }

    if (typeof onAfterAdd === 'undefined') {
      onAfterAdd = function ($form, prefix) {};
    }
    this.onAfterAdd = onAfterAdd;
    if (typeof postInit === 'undefined') {
      postInit = function ($formset, prefix) {};
    }
    this.postInit = postInit;

    this.addCssClass = 'grp-add-handler';
    this.removeCssClass = 'grp-remove-handler';
    this.emptyCssClass = 'grp-empty-form';
    this.formCssClass = 'grp-dynamic-form';

    this.addText = this.$root.data('add-text');
    this.removeText = this.$root.data('remove-text');

    this.$totalForms = this.$root.find('[name="' + this.prefix + '-TOTAL_FORMS"]').attr('autocomplete', 'off');
    this.$initialForms = this.$root.find('[name="' + this.prefix + '-INITIAL_FORMS"]').attr('autocomplete', 'off');
    this.$maxForms = this.$root.find('[name="' + this.prefix + '-MAX_NUM_FORMS"]').attr('autocomplete', 'off');
    this.$totalForms.attr('name', this.fullPrefix + '-TOTAL_FORMS');
    this.$initialForms.attr('name', this.fullPrefix + '-INITIAL_FORMS');
    this.$maxForms.attr('name', this.fullPrefix + '-MAX_NUM_FORMS');

    this.$templateForm = this.getFormsAndTemplate().filter('.' + this.emptyCssClass);

    this.$addButton = this.$root.find('> .grp-transparent, > .grp-tools').find('.' + this.addCssClass);
    this.$addButtonContainer = this.$addButton.parents('.grp-transparent');

    this.forms = [];
    // Adds already existing forms
    this.getForms().each(function (i, row) {
      new InlineForm(this, $(row));
    }.bind(this));

    this.$addButton.click(this.addHandler.bind(this));

    this.postInit($root, this.fullPrefix);
  }

  InlineFormSet.prototype.getFormsAndTemplate = function() {
    if (this.inlineType == 'tabular') {
      return this.$root.find('> .grp-table > .grp-tbody');
    }
    return this.$root.find('> .grp-items > .grp-module');
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
  // jQuery plugin creation
  //

  $.fn.formset = function(onAfterAdd, postInit, parentInlineForm) {
    new InlineFormSet(this, onAfterAdd, postInit, parentInlineForm);
    return this;
  };

})(grp.jQuery);
