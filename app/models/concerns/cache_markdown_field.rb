# This module takes care of updating cache columns for Markdown-containing
# fields. Use like this in the body of your class:
#
#     include CacheMarkdownField
#     cache_markdown_field :foo
#     cache_markdown_field :bar
#     cache_markdown_field :baz, pipeline: :single_line
#
# Corresponding foo_html, bar_html and baz_html fields should exist.
module CacheMarkdownField
  # Knows about the relationship between markdown and html field names, and
  # stores the rendering contexts for the latter
  class FieldData
    def initialize
      @data = {}
    end

    delegate :[], :[]=, to: :@data

    def markdown_fields
      @data.keys
    end

    def html_field(markdown_field)
      "#{markdown_field}_html"
    end

    def html_fields
      markdown_fields.map {|field| html_field(field) }
    end
  end

  def skip_project_check?
    false
  end

  extend ActiveSupport::Concern

  included do
    cattr_reader :cached_markdown_fields do
      FieldData.new
    end

    # Returns the default Banzai render context for the cached markdown field.
    def banzai_render_context(field)
      raise ArgumentError.new("Unknown field: #{field.inspect}") unless
        cached_markdown_fields.markdown_fields.include?(field)

      # Always include a project key, or Banzai complains
      project = self.project if self.respond_to?(:project)
      context = cached_markdown_fields[field].merge(project: project)

      # Banzai is less strict about authors, so don't always have an author key
      context[:author] = self.author if self.respond_to?(:author)

      context
    end

    # Allow callers to look up the cache field name, rather than hardcoding it
    def markdown_cache_field_for(field)
      raise ArgumentError.new("Unknown field: #{field}") unless
        cached_markdown_fields.markdown_fields.include?(field)

      cached_markdown_fields.html_field(field)
    end

    # Always exclude _html fields from attributes (including serialization).
    # They contain unredacted HTML, which would be a security issue
    alias_method :attributes_before_markdown_cache, :attributes
    def attributes
      attrs = attributes_before_markdown_cache

      cached_markdown_fields.html_fields.each do |field|
        attrs.delete(field)
      end

      attrs
    end
  end

  class_methods do
    private

    # Specify that a field is markdown. Its rendered output will be cached in
    # a corresponding _html field. Any custom rendering options may be provided
    # as a context.
    def cache_markdown_field(markdown_field, context = {})
      cached_markdown_fields[markdown_field] = context

      html_field = cached_markdown_fields.html_field(markdown_field)
      cache_method = "#{markdown_field}_cache_refresh".to_sym
      invalidation_method = "#{html_field}_invalidated?".to_sym

      define_method(cache_method) do
        options = { skip_project_check: skip_project_check? }
        html = Banzai::Renderer.cacheless_render_field(self, markdown_field, options)
        __send__("#{html_field}=", html)
        true
      end

      # The HTML becomes invalid if any dependent fields change. For now, assume
      # author and project invalidate the cache in all circumstances.
      define_method(invalidation_method) do
        changed_fields = changed_attributes.keys
        invalidations = changed_fields & [markdown_field.to_s, "author", "project"]
        !invalidations.empty?
      end

      before_save cache_method, if: invalidation_method
    end
  end
end
